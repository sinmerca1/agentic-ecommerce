#!/bin/bash

# Wait for Ollama to be ready
echo "Waiting for Ollama to be ready..."
for i in {1..30}; do
  if curl -s http://localhost:11434/api/tags > /dev/null 2>&1; then
    echo "✓ Ollama is ready"
    break
  fi
  echo "Attempt $i/30: Waiting for Ollama..."
  sleep 2
done

# Pull required models
echo "Pulling llama3.2:3b model..."
ollama pull llama3.2:3b

echo "Pulling nomic-embed-text model..."
ollama pull nomic-embed-text

echo "✓ Models ready"
