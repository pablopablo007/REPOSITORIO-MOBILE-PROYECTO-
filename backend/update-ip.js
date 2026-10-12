const os = require('os');
const fs = require('fs');
const path = require('path');

// Obtener la IP local
const interfaces = os.networkInterfaces();
let localIp = '127.0.0.1';

for (const name of Object.keys(interfaces)) {
  for (const iface of interfaces[name]) {
    // Ignorar las internas (127.0.0.1) y las que no son IPv4
    if ('IPv4' !== iface.family || iface.internal !== false) {
      continue;
    }
    // Preferir Wi-Fi o Ethernet
    if (name.includes('Wi-Fi') || name.includes('Ethernet') || name.includes('Conexión de área local')) {
       localIp = iface.address;
       break;
    }
  }
  if (localIp !== '127.0.0.1') break;
}

// Fallback si no se encontró Wi-Fi/Ethernet por nombre
if (localIp === '127.0.0.1') {
  for (const name of Object.keys(interfaces)) {
    for (const iface of interfaces[name]) {
      if ('IPv4' === iface.family && iface.internal === false) {
         localIp = iface.address;
         break;
      }
    }
    if (localIp !== '127.0.0.1') break;
  }
}

// Ruta al archivo .env.local en la app móvil
const envFilePath = path.resolve(__dirname, '../.env.local');

if (fs.existsSync(envFilePath)) {
  let content = fs.readFileSync(envFilePath, 'utf8');
  // Reemplazar la URL base actual con la nueva IP
  const updatedContent = content.replace(
    /EXPO_PUBLIC_API_URL=http:\/\/[0-9\.]+:\d+/, 
    `EXPO_PUBLIC_API_URL=http://${localIp}:3000`
  );
  
  if (content !== updatedContent) {
    fs.writeFileSync(envFilePath, updatedContent, 'utf8');
    console.log(`\x1b[32m[Auto-IP]\x1b[0m Archivo .env.local actualizado: http://${localIp}:3000`);
  } else {
    console.log(`\x1b[36m[Auto-IP]\x1b[0m La IP ya está correctamente configurada en .env.local (http://${localIp}:3000)`);
  }
} else {
  console.log(`\x1b[33m[Auto-IP]\x1b[0m No se encontró el archivo ${envFilePath}`);
}
