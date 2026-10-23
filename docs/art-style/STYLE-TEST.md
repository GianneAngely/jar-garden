# Jar Garden: tes gaya art (A/B/C/D)

Permintaan Angel (23 Okt): pilihan art harus beda **gaya**, bukan variasi karakter. Gaya yang dia pilih buat dicoba: Pixel art cozy, Gouache flat, Clay/miniatur 3D. Gaya sekarang ikut sebagai pembanding.
Status: **lembar udah jadi (23 Okt), nunggu Angel milih.** Lembar: `docs/art-style/style-ABCD.jpg`. Hasil mentah Flow ada di `art/flow/style-test/`.

## Adegannya sama di semua gaya
Biar perbandingannya adil, tiap gaya gambar adegan yang persis sama, 16:9:
- toples kaca bertutup gabus di ambang jendela kayu
- di dalam toples ada karpet lumut, satu siput pink, satu jamur merah kecil, satu pakis, sama dua kunang-kunang kuning yang nyala
- landak tetangga (Hazel: syal lilac, bawa mug) berdiri di sebelah kiri toples, ngeliat ke toples
- di luar jendela langit senja pastel
- ga ada teks

## Prompt per gaya (Flow, Nano Banana, x2)
Bagian yang sama di semua prompt:
`A cozy game scene, 16:9: a glass jar with a cork lid on a wooden windowsill. Inside the jar: a soft green moss carpet, one small pink snail, one tiny red mushroom, one little fern and two glowing yellow fireflies. A hedgehog neighbour wearing a lilac shawl and holding a mug stands to the left of the jar, smiling at it. Pastel dusk sky through the window behind. No text, no UI.`

- **A. Pensil warna pastel (sekarang):** + `Style: soft pastel coloured pencil illustration with warm brown outlines, light paper grain, cute storybook look.` (lampirin landak M2 sebagai referensi gaya)
- **B. Pixel art cozy:** + `Style: cozy pixel art, chunky readable pixels at about 320x180 scaled up, limited warm pastel palette, crisp 1px dark-brown outlines, no anti-aliasing, like a modern indie farming game.`
- **C. Gouache flat:** + `Style: flat gouache painting, simple rounded shapes, matte opaque colour fields, soft gradients only in the sky, minimal outlines, gentle shadows, like a calm indie adventure game.`
- **D. Clay / miniatur 3D:** + `Style: handmade clay miniature diorama, soft plasticine textures with fingerprints, tilt-shift depth of field, warm studio light, cute rounded forms.`

Cadangan: kalau ada gaya yang kehilangan landak atau toplesnya, generate sekali lagi.

## Lembar perbandingan
- `docs/art-style/style-ABCD.jpg`: 4 gaya dalam grid 2×2, berlabel A/B/C/D, plus satu kalimat penjelasan per gaya.
- Di bawahnya ada potongan ukuran sprite (toples + siput kira-kira seukuran di layar game), biar keliatan gimana tiap gaya pas jadi kecil di game.

## Kalau Angel milih gaya baru: aset yang perlu dibikin ulang
Kira-kira 25–30 generasi, terus dipotong pakai `tools/make_sprites.py`. Kodenya ga berubah.
- **Makhluk:** snail, snail-sad, springtail, firefly, fern, mushroom (6 + 1)
- **Tanah:** moss, mould, leaves, soil (4)
- **Benda:** lamp, cork, 8 ikon (spray, bulb, lid, drop, seed, sprout, air, heart)
- **Latar:** jendela siang, jendela malam, key art judul
- **Tetangga:** hedgehog, mole, owl, frog (4, sekalian A/B per karakter di gaya yang dipilih)
- **Logo:** "Jar Garden" (2–3 versi)
- **Kartu pos, panel, sama tombol:** tetap digambar pakai kode. Warnanya disesuaiin ke palet gaya baru.

Perkiraan waktunya sekitar 2–3 jam giliran Chrome plus 1 hari integrasi. Abis itu GIF, screenshot, cover, sama trailer direkam ulang otomatis pakai alat yang udah ada (sekitar 1 jam).

## Catatan teknis per gaya
- **Pixel art:** sprite di-resize pakai nearest-neighbour, bukan LANCZOS, biar pikselnya tetap tajam. Phaser pakai `pixelArt: true` atau `roundPixels`. Font UI ganti ke font pixel OFL (misalnya Pixelify Sans atau DotGothic16), panel digambar pakai sudut kotak.
- **Gouache / clay:** pipeline sekarang (latar hijau #00FF00, terus di-key) tetap jalan. Bayangan lembut clay mungkin perlu ambang key yang lebih longgar.
