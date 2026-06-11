# Key Finder — Plan de déploiement (Vercel + Cloudflare Tunnel)

> Document destiné à **l'agent codeur** (tâches à coder + checklists) et à **l'humain**
> (tâches obligatoirement manuelles : DNS, comptes, secrets). Les tâches humaines sont
> marquées **🧑 HUMAIN**, les tâches de code **🤖 AGENT**.

---

## 1. Objectif

L'application tourne aujourd'hui en local via `docker compose` (4 conteneurs). On veut :

- **Frontend** → hébergé sur **Vercel** (Next.js, App Router, `output: "standalone"`).
- **Backend + worker + Postgres + fichiers audio** → hébergés **localement** chez toi,
  exposés à Internet via un **Cloudflare Tunnel** (comme pour Arpent).
- Accès réservé **à toi seul** via un **token applicatif maison** (décision retenue).
- **Base de données : Postgres local** conservé (décision retenue — aucune migration vers Supabase).
- Domaine de test : **`api.keyfinder.arpent.online`** pour le backend (sous-domaine d'`arpent.online`).
  Le frontend reste sur l'**URL Vercel par défaut** (`*.vercel.app`) pour l'instant.

### Décisions verrouillées

| Sujet            | Choix retenu                                                            |
|------------------|-------------------------------------------------------------------------|
| Auth             | Token applicatif maison (secret partagé unique)                         |
| Domaine front    | URL Vercel par défaut (`*.vercel.app`)                                  |
| Base de données  | Postgres **local** (conteneur existant)                                 |
| Backend public   | Cloudflare Tunnel → `api.keyfinder.arpent.online`                       |

---

## 2. Architecture cible

```
                    ┌──────────────────────────────────────────────┐
   Navigateur       │                  TON PC (Windows 11)          │
  (toi, partout)    │                                               │
        │           │   ┌─────────┐   ┌──────────┐   ┌───────────┐ │
        │  HTTPS     │   │ backend │──▶│ Postgres │   │  worker   │ │
        ├───────────────│  :8000  │   │  :5432   │   │ (yt-dlp,  │ │
        │  (token)   │   │(FastAPI)│   └──────────┘   │  ffmpeg,  │ │
        │           │   └────┬────┘        ▲          │ essentia) │ │
        │           │        │             │          └─────┬─────┘ │
        │           │   volume audio_data ─┴────────────────┘       │
        │           │        ▲                                      │
        │           │   ┌────┴───────┐                              │
        │           │   │ cloudflared│  (tunnel sortant, pas de     │
        │           │   │  (service) │   port entrant à ouvrir)     │
        │           │   └────┬───────┘                              │
        │           └────────┼──────────────────────────────────────┘
        │                    │ tunnel chiffré sortant
        │                    ▼
        │           ┌─────────────────┐
        │           │   Cloudflare    │  DNS: api.keyfinder.arpent.online
        │           │   (edge + DNS)  │  → CNAME vers le tunnel
        │           └─────────────────┘
        │                    ▲
        ▼                    │ appels API directs navigateur → backend
  ┌──────────────┐          │ (REST + SSE + audio Range), header/query token
  │   Vercel     │          │
  │  (frontend   │──────────┘
  │  Next.js)    │   NEXT_PUBLIC_API_BASE_URL = https://api.keyfinder.arpent.online
  └──────────────┘
```

### Contrainte structurante (à NE PAS oublier)

Le **navigateur appelle le backend en direct** (`NEXT_PUBLIC_API_BASE_URL`), pas via le serveur Next.js.
Trois familles d'appels existent et **toutes** doivent être authentifiées :

1. **REST classique** (openapi-fetch) → header `Authorization: Bearer <token>` possible.
2. **SSE** `/api/jobs/stream` via `EventSource` ([jobs-stream.tsx](frontend/src/components/jobs-stream.tsx)) →
   **ne peut PAS envoyer de header** → token en **query-param** `?token=`.
3. **Audio** `/api/tracks/{id}/audio` chargé par wavesurfer (fetch interne) et
   `/api/tracks/{id}/download` ([client.ts](frontend/src/lib/api/client.ts)) →
   **header non injectable** → token en **query-param** `?token=`.

Le backend doit donc accepter le token **soit** en header `Authorization`, **soit** en query-param `token`.

---

## 3. État actuel (constats du code)

- **Aucune authentification** : voir [main.py](backend/app/main.py), CORS = `allow_origins=["*"]`,
  `allow_credentials=True` (combinaison non valide en prod, à corriger).
- Backend = FastAPI, routes sous `/api`, health sur `/api/health`, docs sur `/docs`.
- Backend Dockerfile lance déjà `alembic upgrade head` au démarrage ([Dockerfile](backend/Dockerfile)) → migrations automatiques.
- `docker-compose.yml` actuel est **orienté dev** : bind-mounts `./backend:/app`, frontend en `next dev`,
  ports `5432`/`8000`/`3000` exposés sur `0.0.0.0`.
- Frontend Dockerfile = dev (`next dev`) — **non utilisé en prod** (Vercel build depuis le repo).
- `NEXT_PUBLIC_API_BASE_URL` est une variable **`NEXT_PUBLIC_`** → **figée au build** Next.js
  (changer la valeur ⇒ redéploiement Vercel obligatoire).

---

## 4. 🤖 AGENT — Partie Backend : authentification par token

### 4.1 Config — ajouter le secret

Fichier [backend/app/config.py](backend/app/config.py) — ajouter un champ :

```python
class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    database_url: str = "postgresql+asyncpg://keyfinder:keyfinder@db:5432/keyfinder"
    audio_storage_path: str = "/data/audio"
    max_duration_seconds: int = 1200
    queue_concurrency: int = 2
    youtube_api_key: str = ""

    # Secret partagé unique protégeant toute l'API. Vide = auth désactivée
    # (utile en dev local). En prod : valeur aléatoire forte (>= 32 octets).
    app_auth_token: str = ""

    # Origines autorisées (CORS). Liste séparée par des virgules.
    # En prod : l'URL Vercel exacte. Regex pour couvrir les preview deploys.
    cors_allow_origins: str = "*"
    cors_allow_origin_regex: str = ""
```

### 4.2 Middleware d'authentification

Créer `backend/app/auth.py` :

```python
"""Authentification mono-utilisateur par token applicatif partagé.

Le token est accepté soit dans l'en-tête `Authorization: Bearer <token>`,
soit dans le query-param `?token=` (indispensable pour le SSE via EventSource
et pour les URLs audio lues par <audio>/wavesurfer, qui ne peuvent pas porter
d'en-tête). Comparaison à temps constant.
"""

from __future__ import annotations

import secrets

from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
from starlette.responses import JSONResponse

from app.config import settings

# Chemins jamais protégés : préflight CORS (géré en amont) et health-check
# (sondé par le tunnel / monitoring). Tout le reste exige le token.
_PUBLIC_PATHS = {"/api/health"}


class TokenAuthMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        # Auth désactivée si aucun token n'est configuré (dev local).
        if not settings.app_auth_token:
            return await call_next(request)

        # Laisser passer le préflight CORS (le CORSMiddleware répond avant nous).
        if request.method == "OPTIONS":
            return await call_next(request)

        if request.url.path in _PUBLIC_PATHS:
            return await call_next(request)

        provided = self._extract_token(request)
        if not provided or not secrets.compare_digest(provided, settings.app_auth_token):
            return JSONResponse({"detail": "Unauthorized"}, status_code=401)

        return await call_next(request)

    @staticmethod
    def _extract_token(request: Request) -> str | None:
        header = request.headers.get("Authorization", "")
        if header.startswith("Bearer "):
            return header[len("Bearer ") :].strip()
        return request.query_params.get("token")
```

> **Décision protection des docs** : `/docs`, `/openapi.json`, `/` ne sont **pas** dans
> `_PUBLIC_PATHS` → ils seront protégés par le token. ⚠️ Conséquence : la regen du client
> (`npm run gen:api` qui lit `/openapi.json`) devra passer le token, **ou** se faire en local
> sans `APP_AUTH_TOKEN`. Si tu préfères laisser `/openapi.json` ouvert, ajoute-le à `_PUBLIC_PATHS`.

### 4.3 Câbler middleware + CORS verrouillé

Dans [backend/app/main.py](backend/app/main.py), remplacer le bloc CORS et ajouter le middleware
auth **après** (donc exécuté **avant** — l'ordre Starlette est inverse de l'ajout) le CORS :

```python
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.auth import TokenAuthMiddleware
from app.config import settings
from app.routers import discovery, health, jobs, playlists, tags, tracks

app = FastAPI(title="Key Finder API", version="0.1.0", description="...")

# 1) Auth (ajouté en premier → s'exécute après CORS).
app.add_middleware(TokenAuthMiddleware)

# 2) CORS (ajouté en dernier → s'exécute en premier, gère le préflight).
_origins = [o.strip() for o in settings.cors_allow_origins.split(",") if o.strip()]
app.add_middleware(
    CORSMiddleware,
    allow_origins=_origins if _origins != ["*"] else ["*"],
    allow_origin_regex=settings.cors_allow_origin_regex or None,
    allow_credentials=False,            # token en header/query, pas de cookie
    allow_methods=["*"],
    allow_headers=["*"],
)
# ... include_router inchangé ...
```

> **Note CORS/credentials** : on n'utilise **pas** de cookie → `allow_credentials=False`,
> ce qui permet de garder `*` si jamais besoin. En prod on met l'URL Vercel exacte +
> une regex `https://.*\.vercel\.app` pour couvrir les preview deployments.

### 4.4 Vérifier le SSE derrière Cloudflare

Le SSE ([jobs.py](backend/app/routers/jobs.py)) envoie déjà `Cache-Control: no-cache` et
`X-Accel-Buffering: no` + heartbeat `: keep-alive`. ✅ Compatible Cloudflare. Rien à coder,
**mais** valider en test (cf. §10) que Cloudflare ne bufferise pas le flux.

---

## 5. 🤖 AGENT — Partie Frontend : login + propagation du token

### 5.1 Stockage du token + helpers

Créer `frontend/src/lib/auth.ts` :

```typescript
const TOKEN_KEY = "kf_auth_token";

export function getToken(): string | null {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem(TOKEN_KEY);
}

export function setToken(token: string): void {
  window.localStorage.setItem(TOKEN_KEY, token);
}

export function clearToken(): void {
  window.localStorage.removeItem(TOKEN_KEY);
}

/** Ajoute ?token= à une URL (SSE + audio, qui ne peuvent pas porter de header). */
export function withToken(url: string): string {
  const token = getToken();
  if (!token) return url;
  const u = new URL(url);
  u.searchParams.set("token", token);
  return u.toString();
}
```

> **Note vs D46** : la règle « jamais de secret en localStorage » visait la clé YouTube
> (un secret tiers). Ici il s'agit d'un **token de session mono-utilisateur** saisi par toi ;
> son stockage en localStorage est le compromis standard pour une SPA. À documenter, accepté.

### 5.2 Injecter le header sur le client REST

Dans [frontend/src/lib/api/client.ts](frontend/src/lib/api/client.ts), ajouter un middleware
openapi-fetch + tokeniser les URLs audio :

```typescript
import { clearToken, getToken, withToken } from "@/lib/auth";

export const api = createClient<paths>({ baseUrl: API_BASE_URL });

api.use({
  onRequest({ request }) {
    const token = getToken();
    if (token) request.headers.set("Authorization", `Bearer ${token}`);
    return request;
  },
  onResponse({ response }) {
    if (response.status === 401 && typeof window !== "undefined") {
      clearToken();
      window.dispatchEvent(new Event("kf-auth-expired")); // capté par la gate (§5.4)
    }
    return response;
  },
});

export function trackAudioUrl(trackId: string): string {
  return withToken(`${API_BASE_URL}/api/tracks/${trackId}/audio`);
}

export function trackDownloadUrl(trackId: string, format: "wav" | "mp3" = "wav"): string {
  return withToken(`${API_BASE_URL}/api/tracks/${trackId}/download?format=${format}`);
}
```

### 5.3 Tokeniser le SSE

Dans [frontend/src/components/jobs-stream.tsx](frontend/src/components/jobs-stream.tsx), ligne 55 :

```typescript
import { withToken } from "@/lib/auth";
// ...
source = new EventSource(withToken(`${API_BASE_URL}/api/jobs/stream`));
```

### 5.4 Porte de connexion (login gate)

Créer un composant `frontend/src/components/auth-gate.tsx` qui :

- Au montage, lit `getToken()`. Si absent → affiche un formulaire (champ token + bouton).
- À la soumission : appelle un endpoint protégé léger pour valider le token
  (ex. `GET /api/tracks?limit=1`) avec le token candidat ; si 200 → `setToken()` + rend les enfants ;
  si 401 → message d'erreur.
- Écoute l'événement `kf-auth-expired` (émis en §5.2) → revient au formulaire.

Monter `<AuthGate>` dans le layout racine, **autour** de l'app (et autour de `<JobsStream/>`),
dans [frontend/src/app/layout.tsx] (ou le provider client équivalent — à repérer).

> Optionnel : ajouter une page `/login` plutôt qu'une modale. Au choix de l'agent, la gate suffit.

---

## 6. 🤖 AGENT — Compose de production

Créer `docker-compose.prod.yml` (séparé du dev, **sans** frontend, **sans** bind-mounts, ports
liés à `127.0.0.1` uniquement) :

```yaml
# Production locale : db + backend + worker. Le frontend est sur Vercel.
# Seul cloudflared (sur l'hôte) accède au backend → bind sur 127.0.0.1.
services:
  db:
    image: postgres:16-alpine
    restart: unless-stopped
    environment:
      POSTGRES_USER: ${POSTGRES_USER}
      POSTGRES_PASSWORD: ${POSTGRES_PASSWORD}
      POSTGRES_DB: ${POSTGRES_DB}
    volumes:
      - db_data:/var/lib/postgresql/data
    # Pas de mapping de port : la DB reste interne au réseau Docker.
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U ${POSTGRES_USER} -d ${POSTGRES_DB}"]
      interval: 5s
      timeout: 5s
      retries: 10
    networks: [keyfinder]

  backend:
    build: { context: ./backend, dockerfile: Dockerfile }
    restart: unless-stopped
    environment:
      DATABASE_URL: ${DATABASE_URL}
      AUDIO_STORAGE_PATH: ${AUDIO_STORAGE_PATH:-/data/audio}
      MAX_DURATION_SECONDS: ${MAX_DURATION_SECONDS:-1200}
      QUEUE_CONCURRENCY: ${QUEUE_CONCURRENCY:-2}
      YOUTUBE_API_KEY: ${YOUTUBE_API_KEY:-}
      APP_AUTH_TOKEN: ${APP_AUTH_TOKEN}
      CORS_ALLOW_ORIGINS: ${CORS_ALLOW_ORIGINS}
      CORS_ALLOW_ORIGIN_REGEX: ${CORS_ALLOW_ORIGIN_REGEX:-}
    volumes:
      - audio_data:${AUDIO_STORAGE_PATH:-/data/audio}   # pas de bind ./backend
    ports:
      - "127.0.0.1:8000:8000"     # accessible seulement depuis l'hôte (cloudflared)
    depends_on:
      db: { condition: service_healthy }
    networks: [keyfinder]

  worker:
    build: { context: ./worker, dockerfile: Dockerfile }
    restart: unless-stopped
    environment:
      DATABASE_URL: ${DATABASE_URL}
      AUDIO_STORAGE_PATH: ${AUDIO_STORAGE_PATH:-/data/audio}
      MAX_DURATION_SECONDS: ${MAX_DURATION_SECONDS:-1200}
      QUEUE_CONCURRENCY: ${QUEUE_CONCURRENCY:-2}
    volumes:
      - audio_data:${AUDIO_STORAGE_PATH:-/data/audio}
    depends_on:
      db: { condition: service_healthy }
    networks: [keyfinder]

volumes:
  db_data:
  audio_data:

networks:
  keyfinder: { driver: bridge }
```

Lancement : `docker compose -f docker-compose.prod.yml up -d --build`
(migrations Alembic appliquées automatiquement par le backend au démarrage).

Mettre à jour `.env.example` avec les nouvelles variables (`APP_AUTH_TOKEN`,
`CORS_ALLOW_ORIGINS`, `CORS_ALLOW_ORIGIN_REGEX`, et un `POSTGRES_PASSWORD` fort attendu).

---

## 7. 🧑 HUMAIN — Cloudflare Tunnel (sur ton PC Windows)

> Le tunnel est **sortant** : aucun port à ouvrir sur ta box, aucune IP publique fixe requise.

1. **Installer cloudflared** (Windows) :
   ```powershell
   winget install --id Cloudflare.cloudflared
   ```
2. **S'authentifier** (ouvre le navigateur, choisir la zone `arpent.online`) :
   ```powershell
   cloudflared tunnel login
   ```
3. **Créer le tunnel** :
   ```powershell
   cloudflared tunnel create keyfinder
   ```
   Note l'**UUID** du tunnel et le chemin du fichier `*.json` de credentials créé.
4. **Router le DNS** vers le tunnel (crée le CNAME automatiquement dans Cloudflare) :
   ```powershell
   cloudflared tunnel route dns keyfinder api.keyfinder.arpent.online
   ```
5. **Fichier de config** `C:\Users\<toi>\.cloudflared\config.yml` :
   ```yaml
   tunnel: <UUID-du-tunnel>
   credentials-file: C:\Users\<toi>\.cloudflared\<UUID>.json

   ingress:
     - hostname: api.keyfinder.arpent.online
       service: http://localhost:8000
     - service: http_status:404
   ```
6. **Installer comme service Windows** (démarre au boot, tourne en arrière-plan) :
   ```powershell
   cloudflared service install
   ```
7. **Tester** : `https://api.keyfinder.arpent.online/api/health` doit répondre `{"status":"ok"}`
   (health est public). Un appel à `/api/tracks` sans token doit renvoyer **401**.

> ⚠️ **Réglages d'alimentation Windows** : mets le PC en « ne jamais se mettre en veille »
> (au moins le réseau/disque), sinon le service est injoignable quand l'écran s'éteint.
> Vérifie aussi que **Docker Desktop démarre automatiquement** au login.

---

## 8. 🧑 HUMAIN — DNS Cloudflare

- L'étape 4 du §7 crée déjà le **CNAME** `api.keyfinder.arpent.online → <UUID>.cfargotunnel.com`
  (proxied / nuage orange). Vérifie sa présence dans le dashboard Cloudflare → DNS de la zone `arpent.online`.
- Aucune autre entrée DNS nécessaire (le front reste sur `*.vercel.app`).

---

## 9. 🧑 HUMAIN — Vercel (frontend)

> Tu as dit vouloir créer le projet Vercel toi-même. Étapes :

1. **New Project** → importer le repo Git → **Root Directory = `frontend`**.
2. Framework détecté : **Next.js**. Build/Output par défaut conviennent.
3. **Variables d'environnement** (Production + Preview) :
   | Variable                   | Valeur                                      |
   |----------------------------|---------------------------------------------|
   | `NEXT_PUBLIC_API_BASE_URL` | `https://api.keyfinder.arpent.online`       |
   > ⚠️ `NEXT_PUBLIC_*` est figée au build → si tu la changes, **redéploie**.
   > Le **token n'est PAS** une variable Vercel : il est saisi par toi dans la login gate.
4. **Deploy**. Récupère l'URL `*.vercel.app` générée.
5. **Boucle CORS** : communique cette URL à l'agent (ou mets-la toi-même) pour renseigner
   `CORS_ALLOW_ORIGINS` côté backend (`.env` local) :
   - `CORS_ALLOW_ORIGINS=https://ton-projet.vercel.app`
   - `CORS_ALLOW_ORIGIN_REGEX=https://.*\.vercel\.app` (pour autoriser les preview deploys)
   Puis `docker compose -f docker-compose.prod.yml up -d` pour recharger.

---

## 10. Tests de validation (post-déploiement)

| # | Test | Attendu |
|---|------|---------|
| 1 | `GET https://api.keyfinder.arpent.online/api/health` | `200`, `{"status":"ok"}` |
| 2 | `GET …/api/tracks` **sans** token | `401` |
| 3 | `GET …/api/tracks` avec header `Authorization: Bearer <token>` | `200` |
| 4 | `GET …/api/tracks?token=<token>` (query) | `200` |
| 5 | Frontend Vercel : ouverture → login gate s'affiche | formulaire token |
| 6 | Saisie d'un mauvais token | erreur, pas d'accès |
| 7 | Saisie du bon token | app chargée, bibliothèque visible |
| 8 | Import d'une URL YouTube → barre de progression | SSE pousse les updates en direct |
| 9 | Lecture d'un morceau dans le Player | waveform + audio jouent (Range OK via tunnel) |
| 10 | Téléchargement WAV/MP3 | fichier `[BPM][Key] Title` téléchargé |
| 11 | DevTools → Network sur le SSE | flux `text/event-stream` non bufferisé, events au fil de l'eau |
| 12 | Appel depuis une origine non autorisée (autre domaine) | bloqué par CORS |

---

## 11. Sécurité & exploitation

- **Token** : générer une valeur aléatoire forte, ex. `python -c "import secrets;print(secrets.token_urlsafe(32))"`.
  Le stocker **uniquement** dans `.env` (backend) ; le mémoriser pour la login gate. Ne jamais le committer.
- **`.env`** : confirmer qu'il est bien dans `.gitignore` (ne pas committer `POSTGRES_PASSWORD`,
  `YOUTUBE_API_KEY`, `APP_AUTH_TOKEN`).
- **Postgres** : mot de passe fort en prod (≠ `keyfinder`), port **non exposé** publiquement (compose prod OK).
- **Backend** : port lié `127.0.0.1` → seul cloudflared y accède, jamais directement depuis le LAN/Internet.
- **Rotation** : changer le token = mettre à jour `.env` + redémarrer le backend + re-saisir dans la gate.
- **Sauvegardes** : les volumes `db_data` (métadonnées) et `audio_data` (masters WAV) sont la seule
  source de vérité → prévoir un `pg_dump` périodique + copie du volume audio (les WAV sont volumineux).
- **Évolution possible** (si un jour multi-appareils gênant) : passer à Cloudflare Access (Zero Trust)
  en mettant aussi le front sur un sous-domaine `arpent.online` — non retenu pour l'instant.

---

## 12. Checklists récapitulatives

### 🤖 AGENT (code)
- [ ] `config.py` : champs `app_auth_token`, `cors_allow_origins`, `cors_allow_origin_regex`.
- [ ] `backend/app/auth.py` : `TokenAuthMiddleware` (header **ou** query, compare_digest, exempte OPTIONS + `/api/health`).
- [ ] `main.py` : brancher le middleware auth + CORS verrouillé (`allow_credentials=False`).
- [ ] `frontend/src/lib/auth.ts` : `getToken/setToken/clearToken/withToken`.
- [ ] `client.ts` : middleware openapi-fetch (header + 401 handler), `trackAudioUrl`/`trackDownloadUrl` tokenisés.
- [ ] `jobs-stream.tsx` : `EventSource(withToken(...))`.
- [ ] `auth-gate.tsx` + montage dans le layout racine.
- [ ] `docker-compose.prod.yml` (db + backend + worker, ports `127.0.0.1`, pas de bind-mount).
- [ ] `.env.example` mis à jour (nouvelles variables + password fort attendu).
- [ ] Vérifier que `.env` est dans `.gitignore`.
- [ ] (Si docs protégées) documenter la regen client (`gen:api`) avec token ou en local sans token.

### 🧑 HUMAIN (manuel)
- [ ] Installer cloudflared + `tunnel login` (zone arpent.online).
- [ ] `tunnel create keyfinder` + `route dns … api.keyfinder.arpent.online`.
- [ ] Rédiger `config.yml` + `cloudflared service install`.
- [ ] Régler l'alimentation Windows (pas de veille) + autostart Docker Desktop.
- [ ] Générer `APP_AUTH_TOKEN` + `POSTGRES_PASSWORD` forts, remplir `.env` de prod.
- [ ] `docker compose -f docker-compose.prod.yml up -d --build`.
- [ ] Créer le projet Vercel (Root = `frontend`, `NEXT_PUBLIC_API_BASE_URL`), déployer.
- [ ] Renseigner `CORS_ALLOW_ORIGINS` avec l'URL Vercel, recharger le backend.
- [ ] Dérouler les 12 tests de validation (§10).
```
