# Підключення Google Drive та оновлення бази логів (`sclviewer`)

Уся база логів зберігається статично у `public/data/catalog.json`, а самі `.wclf` файли качаються браузером безпосередньо з твоєї папки на Google Drive (`1WxyGu4ocykqVJQtYrgoMgoF2MEGEOWdp`) без жодного сервера.

---

## Крок 1. Відкрити публічний доступ до папки на Google Drive

1. Відкрий свою папку: [Google Drive — mplus_s5](https://drive.google.com/drive/u/0/folders/1WxyGu4ocykqVJQtYrgoMgoF2MEGEOWdp)
2. Натисни правою кнопкою по назві папки (або іконку поділитися зверху) -> **Поділитися (Share)**.
3. У блоці **Загальний доступ (General access)** зміни з *Обмежений доступ* на **Усі, хто має посилання (Anyone with the link)**, роль — **Читач (Viewer)**.
4. Натисни **Готово (Done)**.

---

## Крок 2. Створити безкоштовний Google Cloud API Key

1. Перейди в [Google Cloud Console](https://console.cloud.google.com/).
2. Створи новий проєкт (наприклад, `sclviewer-drive`) або вибери існуючий.
3. У лівому меню відкрий **APIs & Services -> Library**, знайди **Google Drive API** і натисни **Enable**.
4. Відкрий **APIs & Services -> Credentials -> + Create Credentials -> API key**.
5. Скопіюй створений ключ (виглядає як `AIzaSy...`).
6. *(Рекомендовано для безпеки в публічному репозиторії)* Натисни на створений ключ (**Edit API key**):
   - У розділі **Application restrictions** вибери **Websites (HTTP referrers)** і додай:
     - `https://pelia0.github.io/*`
     - `http://localhost:*/*`
     - `http://127.0.0.1:*/*`
   - У розділі **API restrictions** вибери **Restrict key** -> відміть лише **Google Drive API**.
   - Натисни **Save**.

> **Важливо щодо квоти:** Google Drive API v3 дає безкоштовну квоту на мільярди запитів на день (тисячі запитів на 100 секунд). Оскільки каталог фільтрується локально в браузері без запитів до Drive, запит іде лише в момент відкриття конкретного бою, і одразу кешується в IndexedDB браузера користувача.

---

## Крок 3. Зібрати базу та оновити GitHub Pages

Запусти скрипт у **Git Bash** (або PowerShell):

```bash
cd /d/wclviewer
python scripts/build_catalog.py --api-key "AIzaSyВАШ_КЛЮЧ"
```

Скрипт зробить усе автоматично:
1. Просканує локальні `D:\wowlogsparser\data\index.db`, `master_dict.db` і всі `.wclf` файли в `mplus_s5`.
2. Рекурсивно просканує твою папку Google Drive `1WxyGu4ocykqVJQtYrgoMgoF2MEGEOWdp` (усі підпапки данжів) і зіставить кожен `.wclf` файл із його `gdrive_id`.
3. Запише `VITE_GDRIVE_API_KEY` у `.env` (файл `.env` використовується при збірці GitHub Pages / Vite; якщо робиш публічний репозиторій і обмежив ключ HTTP Referrer-ом до `https://pelia0.github.io/*`, його можна безпечно комітити або передати як GitHub Repository Secret `VITE_GDRIVE_API_KEY` у `Settings -> Secrets and variables -> Actions`).
4. Згенерує оновлені `public/data/catalog.json` та `public/data/spells_dict.json`.

Після цього закоміть і запуш зміни:

```bash
git add public/data/catalog.json public/data/spells_dict.json scripts/gdrive_map.json
git commit -m "chore: sync mplus catalog with google drive"
git push
```

GitHub Actions автоматично збере сайт і оновить GitHub Pages!
