import urllib.request
content = urllib.request.urlopen('https://raw.githubusercontent.com/nasrulaja/toko-berkah-project/main/js/glass-rail.js').read().decode('utf-8')
with open('js/glass-rail.js', 'w', encoding='utf-8') as f: f.write(content)
print('Done')

