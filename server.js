require('dotenv').config();
const express = require('express');
const mysql = require('mysql2');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 5000;

// MIDDLEWARE (Bumbu Wajib)
app.use(express.json()); // Biar bisa membaca kiriman data JSON
app.use(cors());         // Jembatan wajib agar Vue.js temanmu tidak diblokir browser

// KONEKSI DATABASE
const db = mysql.createConnection({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASS,
    database: process.env.DB_NAME
});

db.connect((err) => {
    if (err) {
        console.error('Gagal koneksi ke MySQL: ' + err.message);
        return;
    }
    console.log('Koneksi ke MySQL sukses dan aman!');
});

// 1. API: LOGIN
app.post('/api/login', (req, res) => {
    const { email, password } = req.body;
    const sql = "SELECT * FROM users WHERE email = ? AND password = ?";
    
    db.query(sql, [email, password], (err, results) => {
        if (err) return res.status(500).json({ status: "error", message: err.message });
        
        if (results.length > 0) {
            return res.json({
                status: "success",
                message: "Login berhasil!",
                role: results[0].role
            });
        } else {
            return res.status(401).json({ status: "error", message: "Email atau password salah" });
        }
    });
});

// 2. API: TAMBAH PESANAN BARU + NOTA OTOMATIS (Gaya Industri)
app.post('/api/pesanan', (req, res) => {
    const { user_id, jenis_layanan, metode_pembayaran, berat_kg, harga_per_kg } = req.body;

    // 1. Mulai Transaksi (Membuka gerbang aman)
    db.beginTransaction((err) => {
        if (err) return res.status(500).json({ status: "error", message: err.message });

        const sqlPesanan = `INSERT INTO pesanan 
                     (user_id, jenis_layanan, metode_pembayaran, berat_kg, harga_per_kg, tgl_masuk, status) 
                     VALUES (?, ?, ?, ?, ?, CURDATE(), 'belum_dicuci')`;
        const valuesPesanan = [user_id, jenis_layanan, metode_pembayaran, berat_kg, harga_per_kg];

        // 2. Eksekusi Input ke Tabel Pesanan
        db.query(sqlPesanan, valuesPesanan, (err, result) => {
            if (err) {
                // Jika gagal, batalkan transaksi
                return db.rollback(() => {
                    if (err.code === 'ER_NO_REFERENCED_ROW_2') {
                        return res.status(400).json({ status: "error", message: `User ID ${user_id} tidak terdaftar!` });
                    }
                    return res.status(500).json({ status: "error", message: err.message });
                });
            }

            // Ambil ID dari pesanan yang barusan lolos masuk
            const pesananId = result.insertId; 

            const sqlNota = "INSERT INTO nota (pesanan_id, created_at) VALUES (?, NOW())";

            // 3. Eksekusi Input ke Tabel Nota secara otomatis
            db.query(sqlNota, [pesananId], (err, notaResult) => {
                if (err) {
                    // Jika tabel nota eror, batalkan juga pesanan yang di atas tadi!
                    return db.rollback(() => {
                        return res.status(500).json({ status: "error", message: "Gagal membuat nota: " + err.message });
                    });
                }

                // 4. Jika dua-duanya sukses tanpa eror, kunci data permanen (COMMIT)
                db.commit((err) => {
                    if (err) {
                        return db.rollback(() => {
                            return res.status(500).json({ status: "error", message: err.message });
                        });
                    }
                    
                    // Kirim balasan sukses ke Frontend
                    return res.json({
                        status: "success",
                        message: "Pesanan baru dan Nota otomatis berhasil dicatat!",
                        pesanan_id: pesananId
                    });
                });
            });
        });
    });
});

// 3. API: AMBIL SEMUA PESANAN (Dashboard)
app.get('/api/pesanan', (req, res) => {
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
app.put('/api/pesanan/:id', (req, res) => {
    const pesananId = req.params.id;
    const { status } = req.body; 

    // Validasi daftar status yang sesuai dengan ENUM di MySQL kamu
    const statusResmi = ['belum siap', 'selesai', 'sudah diambil'];

    if (!statusResmi.includes(status)) {
        return res.status(400).json({ 
            status: "error", 
            message: "Status tidak valid! Pilihannya hanya: 'belum siap', 'selesai', atau 'sudah diambil'." 
        });
    }

    const sql = "UPDATE pesanan SET status = ? WHERE id = ?";

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

// JALANKAN SERVER
app.listen(PORT, () => {
    console.log(`Server Node.js berjalan di http://127.0.0.1:${PORT}`);
});