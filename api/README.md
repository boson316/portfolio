# Portfolio API（Perxona token + Groq chat）

後端程式碼目錄，與 repo 根目錄前端同屬 [boson316/portfolio](https://github.com/boson316/portfolio)。

## 本機

```powershell
cd api
Copy-Item .env.example .env
pip install -r requirements.txt
python app.py
```

## Render

- Repo：`boson316/portfolio`
- **Root Directory：** `api`
- Start：`gunicorn --bind 0.0.0.0:$PORT app:app`

整合說明見 repo 根目錄 `PERXONA.md`。
