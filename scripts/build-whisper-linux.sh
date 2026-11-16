#!/usr/bin/env bash
# Gera o `whisper-cli` para Linux x64 (um arquivo só, em CPU) a partir do whisper.cpp.
# Não há binário oficial para Linux, então ele é compilado aqui e publicado no Release
# `components-v1` do repositório; o assistente do app baixa de lá.
#
# Uso:  scripts/build-whisper-linux.sh            (pede git, cmake, g++ e make)
# Saída: dist-components/whisper-cli-linux-x64, com tamanho e SHA-256 para o catálogo
#        (src/components/component-manifest.ts, variante `linux-x64` da transcrição).
set -euo pipefail

WHISPER_CPP_REF="${WHISPER_CPP_REF:-v1.9.5}"
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
WORK="$(mktemp -d)"
OUT="$ROOT/dist-components"

trap 'rm -rf "$WORK"' EXIT

for tool in git cmake g++ make; do
  command -v "$tool" >/dev/null || { echo "Falta o programa: $tool" >&2; exit 1; }
done

git clone --depth 1 --branch "$WHISPER_CPP_REF" https://github.com/ggml-org/whisper.cpp "$WORK/src"

# Estático e sem `-march=native`: o mesmo arquivo roda em qualquer processador x86-64 recente.
cmake -S "$WORK/src" -B "$WORK/build" \
  -DCMAKE_BUILD_TYPE=Release \
  -DBUILD_SHARED_LIBS=OFF \
  -DGGML_NATIVE=OFF \
  -DGGML_OPENMP=OFF \
  -DWHISPER_BUILD_TESTS=OFF \
  -DWHISPER_BUILD_SERVER=OFF \
  -DCMAKE_EXE_LINKER_FLAGS="-static-libstdc++ -static-libgcc"
cmake --build "$WORK/build" --config Release --target whisper-cli -j "$(nproc)"

mkdir -p "$OUT"
cp "$WORK/build/bin/whisper-cli" "$OUT/whisper-cli-linux-x64"
chmod 755 "$OUT/whisper-cli-linux-x64"

echo
echo "Arquivo: $OUT/whisper-cli-linux-x64"
echo "Tamanho: $(stat -c %s "$OUT/whisper-cli-linux-x64") bytes"
echo "SHA-256: $(sha256sum "$OUT/whisper-cli-linux-x64" | cut -d' ' -f1)"
echo "Publique esse arquivo no Release components-v1 e atualize o catálogo com os valores acima."
