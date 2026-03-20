const XLSX = require('xlsx');

function cleanText(value) {
  return typeof value === 'string' ? value.trim() : '';
}

const filePath = 'e:/auction/auction_db_final.xlsx';
const wb = XLSX.readFile(filePath);
const ws = wb.Sheets[wb.SheetNames[0]];
const data = XLSX.utils.sheet_to_json(ws);

const names = ['Sanju Samson', 'Aman Khan', 'Sarfaraz Khan', 'Rahul Chahar', 'Jason Holder'];
const results = data.filter(r => names.includes(r['Player']?.replace(/\*.*/g, '').trim()));

console.log('Audit results for specific players:');
results.forEach(r => {
    console.log(`Player: ${r['Player']}, Acquisition: ${r['Acquisition']}, Price: ${r['Price']}`);
});
