#!/bin/bash
# ==============================================================================
# SECURITY SCANNER SCRIPT (AGEN PENGAMANAN GIT)
# Mencegah kebocoran Password, IP Server Nyata, File .env, dan Secret ke Git
# ==============================================================================

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BOLD='\033[1m'
NC='\033[0m'

ERRORS=0

echo -e "${BOLD}🛡️  [Security Guard] Menjalankan Pemeriksaan Keamanan Pre-Push / Pre-Commit...${NC}"

# 1. Cek file terlarang yang ter-stage
STAGED_FILES=$(git diff --cached --name-only 2>/dev/null)
if [ -z "$STAGED_FILES" ]; then
    # Jika dipanggil pada pre-push, periksa commit yang akan di-push vs remote
    REMOTE_BRANCH=$(git rev-parse --abbrev-ref --symbolic-full-name @{u} 2>/dev/null || echo "origin/main")
    STAGED_FILES=$(git diff --name-only "$REMOTE_BRANCH"...HEAD 2>/dev/null)
fi

for FILE in $STAGED_FILES; do
    # Blokir file .env kecuali .env.example
    if [[ "$FILE" =~ \.env($|\..*) ]] && [[ ! "$FILE" =~ \.env\.example$ ]]; then
        echo -e "${RED}❌ [DIBLOKIR] File environment terdeteksi akan di-push: ${BOLD}$FILE${NC}"
        echo -e "   File .env mutlak tidak boleh di-push ke Git repository!"
        ERRORS=$((ERRORS + 1))
    fi

    # Blokir file binary / arsip / dump database
    if [[ "$FILE" =~ \.(zip|tar\.gz|tar|rar|7z|sql|dump)$ ]]; then
        echo -e "${RED}❌ [DIBLOKIR] File arsip / backup database terdeteksi: ${BOLD}$FILE${NC}"
        echo -e "   File binary / database dump dilarang di-push ke source control!"
        ERRORS=$((ERRORS + 1))
    fi

    # Blokir file private key
    if [[ "$FILE" =~ \.(pem|key|pkcs12|pfx)$ ]] || [[ "$FILE" =~ id_rsa ]]; then
        echo -e "${RED}❌ [DIBLOKIR] Kunci privat / sertifikat terdeteksi: ${BOLD}$FILE${NC}"
        ERRORS=$((ERRORS + 1))
    fi
done

# 2. Cek isi kode yang diubah (diff pada file source code)
DIFF_CONTENT=$(git diff --cached -U0 -- ':(exclude)*.md' ':(exclude)*.docx' ':(exclude)scripts/security-check.sh' 2>/dev/null)
if [ -z "$DIFF_CONTENT" ]; then
    REMOTE_BRANCH=$(git rev-parse --abbrev-ref --symbolic-full-name @{u} 2>/dev/null || echo "origin/main")
    DIFF_CONTENT=$(git diff -U0 "$REMOTE_BRANCH"...HEAD -- ':(exclude)*.md' ':(exclude)*.docx' ':(exclude)scripts/security-check.sh' 2>/dev/null)
fi

# Filter hanya baris yang ditambahkan (+), abaikan baris +++ b/path
ADDED_LINES=$(echo "$DIFF_CONTENT" | grep '^+[^+]')

if [ -n "$ADDED_LINES" ]; then
    # A. Deteksi Raw IPv4 Server Nyata (bukan 127.0.0.1, bukan 0.0.0.0, bukan kode rekening titik banyak)
    # Mencari pola IP 4-oktet publik/server
    SUSPICIOUS_IPS=$(echo "$ADDED_LINES" | grep -Eo '\b([1-9][0-9]?|1[0-9]{2}|2[0-4][0-9]|25[0-5])\.([0-9]{1,3})\.([0-9]{1,3})\.([0-9]{1,3})\b' | grep -v '127.0.0.1' | grep -v '0.0.0.0' | sort -u)

    if [ -n "$SUSPICIOUS_IPS" ]; then
        echo -e "${RED}❌ [DIBLOKIR] Alamat IP server / publik mentah terdeteksi di dalam source code:${NC}"
        echo "$SUSPICIOUS_IPS" | while read -r ip; do
            echo -e "   👉 ${BOLD}$ip${NC}"
        done
        echo -e "${YELLOW}   Saran: Pindahkan IP ke environment variable (.env) atau gunakan nama domain resmi (*.konaweselatankab.go.id)!${NC}"
        ERRORS=$((ERRORS + 1))
    fi

    # B. Deteksi password / secret yang di-hardcode (e.g. password: '...', NewKominfo, dll.)
    HARDCODED_PASS=$(echo "$ADDED_LINES" | grep -Ei "(password|passwd|secret)\s*[:=]\s*['\"][^'\"]{4,}['\"]" | grep -Eiv "(process\.env|your_|dummy|<|placeholder|!EGOV|SENTINEL)" | head -n 5)

    if [ -n "$HARDCODED_PASS" ]; then
        echo -e "${RED}❌ [DIBLOKIR] Indikasi kata sandi / secret hardcode terdeteksi:${NC}"
        echo "$HARDCODED_PASS" | while read -r line; do
            echo -e "   👉 ${BOLD}$line${NC}"
        done
        echo -e "${YELLOW}   Saran: Jangan menulis kata sandi atau secret langsung di kode! Gunakan process.env.*!${NC}"
        ERRORS=$((ERRORS + 1))
    fi

    # C. Deteksi Private Key Block
    if echo "$ADDED_LINES" | grep -q "BEGIN.*PRIVATE KEY"; then
        echo -e "${RED}❌ [DIBLOKIR] Private Key block terdeteksi di baris kode baru!${NC}"
        ERRORS=$((ERRORS + 1))
    fi
fi

# 3. Kesimpulan Evaluasi
if [ $ERRORS -gt 0 ]; then
    echo -e "\n${RED}========================================================================${NC}"
    echo -e "${RED}${BOLD}🛑 PUSH / COMMIT DIBATALKAN OLEH AGEN PENGAMANAN (SECURITY GUARD)!${NC}"
    echo -e "${RED}Ditemukan $ERRORS pelanggaran keamanan pada data yang akan di-push.${NC}"
    echo -e "${YELLOW}Silakan perbaiki file di atas sebelum melanjutkan demi mencegah kebocoran.${NC}"
    echo -e "${RED}========================================================================${NC}\n"
    exit 1
else
    echo -e "${GREEN}✅ [Security Guard] Lolos audit keamanan: Tidak ditemukan kata sandi, IP server mentah, atau file privat.${NC}\n"
    exit 0
fi
