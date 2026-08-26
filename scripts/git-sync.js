import { execSync } from 'child_process';

function run(cmd) {
  try {
    return execSync(cmd, { stdio: 'inherit', encoding: 'utf-8' });
  } catch (e) {
    console.error(`Error running command: ${cmd}`);
    throw e;
  }
}

const customMsg = process.argv.slice(2).join(' ').trim();
const timestamp = new Date().toLocaleString('es-ES', { timeZone: 'America/Santiago' });
const commitMsg = customMsg || `OrbiMod Cloud & Sync Update: ${timestamp}`;

console.log(`\n========================================`);
console.log(`🚀 Sincronizando cambios con GitHub...`);
console.log(`========================================\n`);

try {
  console.log(`1. Agregando archivos modificados (git add .)...`);
  run('git add .');

  console.log(`2. Creando commit: "${commitMsg}"...`);
  try {
    run(`git commit -m "${commitMsg}"`);
  } catch (e) {
    console.log(`ℹ️ No hay cambios pendientes para hacer commit.`);
  }

  console.log(`3. Enviando cambios al repositorio remoto (git push origin main)...`);
  run('git push origin main');

  console.log(`\n✅ ¡Repositorio actualizado con éxito en GitHub!\n`);
} catch (err) {
  console.error(`\n❌ Error al sincronizar con Git:`, err.message);
  process.exit(1);
}
