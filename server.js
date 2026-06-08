require('dotenv').config();
const jwt = require('jsonwebtoken');
const express = require('express');
const mysql = require('mysql2');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 5000;

// MIDDLEWARE (Bumbu Wajib)
app.use(express.json()); // Biar bisa membaca kiriman data JSON
app.use(cors());         

// KONEKSI DATABASE
// KONEKSI DATABASE MENGGUNAKAN POOL (Anti-Putus)
// KONEKSI DATABASE MENGGUNAKAN POOL (Anti-Putus + SSL Aiven)
const db = mysql.createPool({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASS,
    database: process.env.DB_NAME,
    port: process.env.DB_PORT, // 🔥 INI YANG KETINGGALAN TADI
    ssl: {
        rejectUnauthorized: false // 🔥 INI WAJIB AGAR AIVEN TIDAK MENOLAK KONEKSI
    },
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
});

db.getConnection((err, connection) => {
    if (err) {
        console.error('Gagal koneksi ke MySQL: ' + err.message);
        return;
    }
    console.log('Koneksi Pool ke MySQL sukses dan siap tempur di Railway!');
    connection.release(); // Kembalikan koneksi agar bisa dipakai lagi
});

// 1. API: LOGIN 
app.post('/api/login', (req, res) => {
    const { email, password } = req.body;
    const sql = "SELECT * FROM users WHERE email = ? AND password = ?";
    
    db.query(sql, [email, password], (err, results) => {
        if (err) return res.status(500).json({ status: "error", message: err.message });
        
        if (results.length > 0) {
            const user = results[0];
            
            // Data yang dibungkus: id user dan role-nya
            const token = jwt.sign(
                { id: user.id, role: user.role }, 
                process.env.JWT_SECRET, 
                { expiresIn: '1d' } // Token akan expired dalam 1 hari
            );

            return res.json({
                status: "success",
                message: "Login berhasil!",
                role: user.role,
                token: token 
            });
        } else {
            return res.status(401).json({ status: "error", message: "Email atau password salah" });
        }
    });
});
// MIDDLEWARE: Satpam Pemeriksa Token JWT
const verifyToken = (req, res, next) => {
    // Menangkap token dari header (biasanya dikirim dengan format: "Bearer <token_panjang>")
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    // Kalau frontend tidak mengirim token sama sekali
    if (!token) return res.status(401).json({ status: "error", message: "Akses ditolak! Kamu belum login." });

    // Mengecek apakah tokennya asli dan belum kadaluarsa (berdasarkan JWT_SECRET)
    jwt.verify(token, process.env.JWT_SECRET, (err, decoded) => {
        if (err) return res.status(403).json({ status: "error", message: "Token tidak valid atau sudah kadaluarsa!" });
        
        // Kalau lolos, simpan data user (id, role) agar bisa dibaca oleh API di bawahnya
        req.user = decoded; 
        next(); // Persilakan masuk ke dalam API (melanjutkan proses)
    });
};
/// 2. API: TAMBAH PESANAN BARU + NOTA OTOMATIS (Gaya Industri)
app.post('/api/pesanan', verifyToken, (req, res) => {
    const { user_id, jenis_layanan, metode_pembayaran, berat_kg, harga_per_kg } = req.body;
    const total_harga = berat_kg * harga_per_kg;

    // 🔥 PERBAIKAN: Ambil 1 jalur koneksi khusus dari Pool
    db.getConnection((err, connection) => {
        if (err) return res.status(500).json({ status: "error", message: "Gagal mendapat koneksi: " + err.message });

        // 1. Mulai Transaksi di jalur koneksi khusus ini
        connection.beginTransaction((err) => {
            if (err) {
                connection.release(); // Balikin koneksi kalau gagal
                return res.status(500).json({ status: "error", message: err.message });
            }

            const sqlPesanan = `INSERT INTO pesanan 
                                 (user_id, jenis_layanan, metode_pembayaran, berat_kg, harga_per_kg, total_harga, tgl_masuk, status) 
                                 VALUES (?, ?, ?, ?, ?, ?, CURDATE(), 'belum_dicuci')`;
            const valuesPesanan = [user_id, jenis_layanan, metode_pembayaran, berat_kg, harga_per_kg, total_harga];

            // 2. Eksekusi Input ke Tabel Pesanan (Pakai 'connection', bukan 'db')
            connection.query(sqlPesanan, valuesPesanan, (err, result) => {
                if (err) {
                    return connection.rollback(() => {
                        connection.release();
                        if (err.code === 'ER_NO_REFERENCED_ROW_2') {
                            return res.status(400).json({ status: "error", message: `User ID ${user_id} tidak terdaftar!` });
                        }
                        return res.status(500).json({ status: "error", message: err.message });
                    });
                }

                const pesananId = result.insertId; 
                const sqlNota = "INSERT INTO nota (pesanan_id, created_at) VALUES (?, NOW())";

                // 3. Eksekusi Input ke Tabel Nota 
                connection.query(sqlNota, [pesananId], (err, notaResult) => {
                    if (err) {
                        return connection.rollback(() => {
                            connection.release();
                            return res.status(500).json({ status: "error", message: "Gagal membuat nota: " + err.message });
                        });
                    }

                    // 4. COMMIT (Kunci data permanen)
                    connection.commit((err) => {
                        if (err) {
                            return connection.rollback(() => {
                                connection.release();
                                return res.status(500).json({ status: "error", message: err.message });
                            });
                        }
                        
                        // 🔥 PENTING: Kembalikan koneksi ke Pool setelah semua sukses
                        connection.release(); 
                        
                        return res.json({
                            status: "success",
                            message: "Pesanan baru dan Nota otomatis berhasil dicatat!",
                            pesanan_id: pesananId,
                            total_tagihan: total_harga 
                        });
                    });
                });
            });
        });
    });
});

// 3. API: AMBIL SEMUA PESANAN (Dashboard)
app.get('/api/pesanan', verifyToken, (req, res) => {
    const sql = "SELECT * FROM pesanan ORDER BY tgl_masuk DESC";
    
    db.query(sql, (err, results) => {
        if (err) return res.status(500).json({ status: "error", message: err.message });
        return res.json({
            status: "success",
            data: results
        });
    });
});

// 4. API: UPDATE STATUS PESANAN
app.put('/api/pesanan/:id', verifyToken, (req, res) => {
    const pesananId = req.params.id;
    const { status } = req.body; 

    // Validasi daftar status yang sesuai dengan ENUM di MySQL kamu
    const statusResmi = ['belum_dicuci', 'sedang_dicuci', 'selesai'];

    if (!statusResmi.includes(status)) {
        return res.status(400).json({ 
            status: "error", 
            message: "Status tidak valid! Pilihannya hanya: 'belum_dicuci', 'sedang_dicuci', atau 'selesai'." 
    });
}

    const sql = "UPDATE pesanan SET status = ? WHERE Nomor_id = ?";

    db.query(sql, [status, pesananId], (err, result) => {
        if (err) return res.status(500).json({ status: "error", message: err.message });
        
        if (result.affectedRows === 0) {
            return res.status(404).json({ status: "error", message: "Pesanan tidak ditemukan!" });
        }

        return res.json({
            status: "success",
            message: `Status pesanan ID ${pesananId} sukses diubah menjadi '${status}'!`
        });
    });
});

// 5. API: HAPUS PESANAN (Batal Cuci / Salah Input)
app.delete('/api/pesanan/:id', verifyToken, (req, res) => {
    const pesananId = req.params.id;
    
    const sql = "DELETE FROM pesanan WHERE Nomor_id = ?";

    db.query(sql, [pesananId], (err, result) => {
        if (err) {
            // Menangani error jika pesanan ini sudah punya nota (terikat relasi)
            if (err.code === 'ER_ROW_IS_REFERENCED_2') {
                return res.status(400).json({ 
                    status: "error", 
                    message: "Pesanan tidak bisa dihapus karena sudah memiliki nota cetak!" 
                });
            }
            return res.status(500).json({ status: "error", message: err.message });
        }
        
        if (result.affectedRows === 0) {
            return res.status(404).json({ status: "error", message: "Pesanan tidak ditemukan!" });
        }

        return res.json({
            status: "success",
            message: `Pesanan ID ${pesananId} berhasil dihapus dari sistem!`
        });
    });
});

// JALANKAN SERVER
app.listen(PORT, () => {
    console.log(`Server Node.js berjalan di http://127.0.0.1:${PORT}`);
});
