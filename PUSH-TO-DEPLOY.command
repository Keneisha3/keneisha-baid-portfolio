#!/bin/zsh
export PATH="$HOME/.local/bin:$HOME/.node20/bin:/usr/local/bin:/opt/homebrew/bin:$PATH"
cd "$(dirname "$0")"
echo "==> Checking GitHub login..."
if ! gh auth status >/dev/null 2>&1; then
  echo "You need to log in to GitHub (a browser will open)."
  gh auth login -h github.com -p https -w
fi
gh auth setup-git
echo "==> Pushing to keneisha-baid-portfolio (this triggers the Vercel deploy)..."
git push origin main && echo "\n✅ Pushed! Vercel will redeploy in ~1 minute. Then hard-refresh the site (Cmd+Shift+R)." || echo "\n❌ Push failed — see the message above."
echo "\nPress Return to close." ; read _
