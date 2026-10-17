const fs = require('fs');
const path = require('path');
const solc = require(path.join(__dirname, '_solc', 'node_modules', 'solc'));

const inputPath = process.argv[2] || 'contracts/WBOGToken_std_clean.json';
const input = JSON.parse(fs.readFileSync(inputPath, 'utf8'));

const output = JSON.parse(solc.compile(JSON.stringify(input)));
if (output.errors) {
  const fatal = output.errors.filter(e => e.severity === 'error');
  if (fatal.length) {
    console.log('COMPILE ERRORS:');
    fatal.forEach(e => console.log(e.formattedMessage));
    process.exit(1);
  }
}

const c = output.contracts['contracts/WBOGToken.sol']['WBOGToken'];
const bc = '0x' + c.evm.deployedBytecode.object;
const artifact = JSON.parse(fs.readFileSync('contracts/out/WBOGToken.sol/WBOGToken.json', 'utf8'));
const local = artifact.deployedBytecode.object.startsWith('0x') ? artifact.deployedBytecode.object : '0x' + artifact.deployedBytecode.object;

console.log('solc version:', solc.version());
console.log('compiled len:', bc.length, 'artifact len:', local.length);
console.log('RUNTIME MATCH:', bc.toLowerCase() === local.toLowerCase());
console.log('tail compiled:', bc.slice(-120));
