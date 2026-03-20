const XLSX = require('xlsx');
const fs = require('fs');

const excelPath = 'e:/auction/auction_db.xlsx';
const workbook = XLSX.readFile(excelPath);
const sheetName = workbook.SheetNames[0];
const worksheet = workbook.Sheets[sheetName];
const data = XLSX.utils.sheet_to_json(worksheet);

console.log('Total players in auction_db.xlsx:', data.length);
console.log('--- Searching for missing players ---');
const missing = ['Shreyas Iyer', 'KL Rahul', 'Rishabh Pant', 'Mitchell Starc', 'Jos Buttler', 'Ravichandran Ashwin', 'David Warner', 'Faf Du Plessis'];
missing.forEach(name => {
    const p = data.find(x => {
        const rowName = x.Player || x.Name;
        return rowName && (rowName.toLowerCase().includes(name.toLowerCase()) || name.toLowerCase().includes(rowName.toLowerCase()));
    });
    if (p) {
        console.log(`MATCH [${name}]: Found [${p.Player || p.Name}] -> ${p.Team || p.IPL_Team || p['IPL Team (2026)']}`);
    } else {
        console.log(`MISS [${name}]: Not in auction_db.xlsx`);
    }
});
