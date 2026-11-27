AI Passport — Linux

Ubuntu / Debian 推荐直接安装 .deb 包：sudo apt install ./AI-Passport-*.deb
For Ubuntu and Debian, the .deb package is easier: sudo apt install ./AI-Passport-*.deb

这个压缩包用于其他发行版 / This archive is for other distributions:

1. 依赖 / Requires: glibc 2.35+, GTK 3, WebKitGTK 4.1
   Fedora: sudo dnf install gtk3 webkit2gtk4.1
   Arch:   sudo pacman -S gtk3 webkit2gtk-4.1
2. 运行 / Run: ./ai-passport
3. 设备权限 / Device access (once):
   sudo cp 60-ai-passport.rules /etc/udev/rules.d/ && sudo udevadm control --reload-rules
   然后重新插拔 AI Passport / then replug the AI Passport.
   或者 / Or: sudo usermod -aG dialout $USER，注销后重新登录 / then log out and back in.
4. 可选：加到应用菜单 / Optional, add to the app menu:
   复制 ai-passport.desktop 到 ~/.local/share/applications/，把其中的 Exec= 改成程序的完整路径，
   ai-passport.png 复制到 ~/.local/share/icons/。
   Copy ai-passport.desktop to ~/.local/share/applications/ and set Exec= to the full path;
   copy ai-passport.png to ~/.local/share/icons/.
