#!/bin/bash
# Get the WSL2 IP address
WSL_IP=$(hostname -I | awk '{print $1}')

echo "Starting Expo on WSL2 IP: $WSL_IP"
echo "Make sure your phone is on the same WiFi network!"
echo ""

# Set the React Native packager hostname
export REACT_NATIVE_PACKAGER_HOSTNAME=$WSL_IP

# Start Expo
npx expo start --host tunnel
