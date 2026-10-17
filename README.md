# Legendas Iron Supply

App estático (HTML/CSS/JS, sem build) para copiar legendas do Instagram e abrir as imagens no Google Drive.

- `index.html`, `style.css`, `app.js` — interface
- `data.js` — dados gerados (não editar à mão)
- `build-data.mjs` — gera `data.js` a partir do .txt de legendas + `drive-files.json`
- `drive-files.json` — ids/nomes dos arquivos da pasta do Drive 15my8ZoiZdRpqDiPU85WYIr7qpJnK1vLO

Regenerar com outra versão das legendas:

    node build-data.mjs /workspace/legendas-iron-supply-v4.txt

Rodar localmente: `python3 -m http.server 8080` e abrir http://localhost:8080
