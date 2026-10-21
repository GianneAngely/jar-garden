# Catatan per sistem (M3)

## M3a Request tetangga (22 Okt)
GIF: `docs/m3/m3a-notes.gif` (catatan Mo dari awal sampai selesai, terus Olive datang)

Tes: `node tools/reqtest.mjs` (32/32 lolos), `node tools/test.mjs` (22/22), `node tools/simtest.mjs` (9/9).
- Ada 6 catatan di satu toples: Hazel, Mo, Olive, Fen, Hazel, terus pesta.
- Pemain yang serius main lolos 20/20, median 5,5 hari in-game (sekitar 5–9 menit di 2x).
- Pemain yang diem atau salah strategi ga pernah lolos.

**Udah enak:**
- Kartunya kebaca sekilas: siapa yang minta, apa yang diminta, meter yang bergerak, sama hadiahnya.
- Di catatan Mo, 20 titik tanah keisi satu-satu pas lumutnya nyebar. Sebab-akibatnya keliatan langsung.
- Pas catatan selesai: tulisan "Thank you!", hati-hati keluar, biji terbang ke penghitung, tetangganya mantul terus pergi, dan tetangga baru naik dari bawah. Momen ini kerasa kayak hadiah.
- Kartu toko yang masih kekunci nulis "after note N", jadi pemain tau ada yang bakal kebuka.
- Lampu nyala malam-malam bikin Dot keluar gelembung bohlam. Tukar-tambahnya (lumut cepat tumbuh, tapi Dot ngambek) keliatan tanpa harus dijelasin.

**Belum enak, udah dibenerin:**
- Lumut 40% keliatan tipis banget. Sekarang ukurannya digedein, jadi 40% keliatan kayak karpet.
- Toast "Moss added!" nempel terus selama mode tanam. Sekarang toast-nya hilang sendiri. Ketuk di luar toples buat keluar dari mode tanam.
- Dua catatan bisa selesai barengan, terus kartunya tabrakan. Sekarang ada antrian ucapan makasih, dan tiap catatan tetap kebaca sebentar.
- Event kalah kepanggil tiap tick, jadi overlay-nya numpuk. Sekarang cuma muncul sekali, dan Rewind balik ke awal catatan.
- Tombol lampu bilang "off" padahal lampunya nyala. Sekarang tombol ngikutin keadaan toples.

**Masih kurang, dikerjain di sistem berikutnya:**
- 30 detik pertama belum ada panduan (itu M3b). Pemain baru cuma liat kartu Hazel sama gelembung udara di Pip.
- Masih ada baris chip kosong di kartu kalau lagi ga ada petunjuk. Kecil, nanti dirapihin di M4.
- Malamnya gelap banget buat ngeliat progres. Nanti di M4: cahaya lembut kunang-kunang ke lumut.
- Belum ada suara (itu M4).
- Seed pop dari makhluk yang ngehasilin biji, sama keterangan sebab di bar ("▲ plants ▼ snail"), masuk M4. Data `s.flux` udah ada di sim.
- Satu dari 20 pemain butuh 3,9 hari di catatan pesta, biasanya gara-gara springtail kelaparan. Dicek lagi pas M3d.
