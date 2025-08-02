#!/bin/bash

# Script to download Myanmar administrative division flags
echo "Downloading Myanmar administrative division flags..."

cd public/images/flags

# States
echo "Downloading State flags..."
curl -o "chin-state.png" "https://upload.wikimedia.org/wikipedia/commons/thumb/7/7f/Flag_of_Chin_State.svg/23px-Flag_of_Chin_State.svg.png"
curl -o "kachin-state.png" "https://upload.wikimedia.org/wikipedia/commons/thumb/0/0c/Flag_of_Kachin_State.svg/23px-Flag_of_Kachin_State.svg.png"
curl -o "kayah-state.png" "https://upload.wikimedia.org/wikipedia/commons/thumb/2/2e/Flag_of_Kayah_State.svg/23px-Flag_of_Kayah_State.svg.png"
curl -o "kayin-state.png" "https://upload.wikimedia.org/wikipedia/commons/thumb/e/e7/Flag_of_Kayin_State.svg/23px-Flag_of_Kayin_State.svg.png"
curl -o "mon-state.png" "https://upload.wikimedia.org/wikipedia/commons/thumb/f/f2/Flag_of_Mon_State_%282018%29.svg/23px-Flag_of_Mon_State_%282018%29.svg.png"
curl -o "rakhine-state.png" "https://upload.wikimedia.org/wikipedia/commons/thumb/1/1c/Flag_of_Rakhine.svg/23px-Flag_of_Rakhine.svg.png"
curl -o "shan-state.png" "https://upload.wikimedia.org/wikipedia/commons/thumb/4/4f/Flag_of_Shan_State.svg/23px-Flag_of_Shan_State.svg.png"

# Regions
echo "Downloading Region flags..."
curl -o "ayeyarwady-region.png" "https://upload.wikimedia.org/wikipedia/commons/thumb/b/b5/Flag_of_Ayeyarwady_Region.svg/23px-Flag_of_Ayeyarwady_Region.svg.png"
curl -o "bago-region.png" "https://upload.wikimedia.org/wikipedia/commons/thumb/8/8b/Flag_of_Bago_Region.png/23px-Flag_of_Bago_Region.png"
curl -o "magway-region.png" "https://upload.wikimedia.org/wikipedia/commons/thumb/e/e8/Flag_of_Magway_Region.svg/23px-Flag_of_Magway_Region.svg.png"
curl -o "mandalay-region.png" "https://upload.wikimedia.org/wikipedia/commons/thumb/d/d7/Flag_of_Mandalay_Region.svg/23px-Flag_of_Mandalay_Region.svg.png"
curl -o "sagaing-region.png" "https://upload.wikimedia.org/wikipedia/commons/thumb/3/3c/Flag_of_Sagaing_Region_%282019%29.svg/23px-Flag_of_Sagaing_Region_%282019%29.svg.png"
curl -o "tanintharyi-region.png" "https://upload.wikimedia.org/wikipedia/commons/thumb/4/44/Flag_of_Tanintharyi_Region.svg/23px-Flag_of_Tanintharyi_Region.svg.png"
curl -o "yangon-region.png" "https://upload.wikimedia.org/wikipedia/commons/thumb/4/4b/Flag_of_Yangon_Region.svg/23px-Flag_of_Yangon_Region.svg.png"

# Union Territory
echo "Downloading Union Territory flag..."
curl -o "naypyitaw-union-territory.png" "https://upload.wikimedia.org/wikipedia/commons/thumb/f/f4/Flag_of_Naypyidaw_Union_Territory.svg/23px-Flag_of_Naypyidaw_Union_Territory.svg.png"

echo "All flags downloaded successfully!"
echo "Flags are stored in: public/images/flags/"