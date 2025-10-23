#!/bin/bash
#
# Generate gRPC code from proto file
# Run this after modifying pricing.proto
#

set -e

echo "🔨 Generating gRPC code from proto/pricing.proto..."

# Check if grpcio-tools is installed
if ! python -c "import grpc_tools" 2>/dev/null; then
    echo "📦 Installing grpcio-tools..."
    pip install grpcio-tools
fi

# Generate Python code
python -m grpc_tools.protoc \
    -I./proto \
    --python_out=. \
    --grpc_python_out=. \
    ./proto/pricing.proto

echo "✅ Generated:"
echo "   - pricing_pb2.py (message classes)"
echo "   - pricing_pb2_grpc.py (service stubs)"

# Fix imports in generated files (common issue with protobuf)
if [[ "$OSTYPE" == "darwin"* ]]; then
    # macOS
    sed -i '' 's/import pricing_pb2/from . import pricing_pb2/g' pricing_pb2_grpc.py
else
    # Linux
    sed -i 's/import pricing_pb2/from . import pricing_pb2/g' pricing_pb2_grpc.py
fi

echo "✅ Fixed imports in generated files"
echo "🎉 Done! You can now start the gRPC server with: python grpc_server.py"
