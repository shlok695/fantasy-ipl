const XLSX = require('xlsx');
const fs = require('fs');

const excelPath = 'e:/auction/auction_db_final.xlsx';
const workbook = XLSX.readFile(excelPath);
const sheetName = workbook.SheetNames[0];
const worksheet = workbook.Sheets[sheetName];
const data = XLSX.utils.sheet_to_json(worksheet);

const missing = ['Ravichandran Ashwin', 'David Warner', 'Faf Du Plessis'];
missing.forEach(name => {
    console.log(`--- Searching for ${name} ---`);
    const results = data.filter(x => {
        const rowName = x.Player || x.Name;
        if (!rowName) return false;
        const n1 = name.toLowerCase();
        const n2 = rowName.toLowerCase();
        return n2.includes(n1) || n1.includes(n2) || 
               (n2.split(' ').some(part => n1.includes(part)) && n2.split(' ').length > 0);
    });
    results.forEach(r => {
        console.log(`Found: ${r.Player || r.Name} -> ${r['IPL Team (2026)'] || r.Team || r.IPL_Team}`);
    });
});
