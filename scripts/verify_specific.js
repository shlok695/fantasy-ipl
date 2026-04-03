const XLSX = require('xlsx');
const path = require('path');
const fs = require('fs');

const excelPath = 'e:/auction/auction_db_final.xlsx';
const workbook = XLSX.readFile(excelPath);
const sheetName = workbook.SheetNames[0];
const worksheet = workbook.Sheets[sheetName];
const data = XLSX.utils.sheet_to_json(worksheet);

const playersToCheck = ['Shreyas Iyer', 'KL Rahul', 'Rishabh Pant', 'Mitchell Starc', 'Jos Buttler', 'Kagiso Rabada'];
playersToCheck.forEach(name => {
    const p = data.find(x => (x.Player || x.Name) === name);
    if (p) {
        console.log(`${name}: ${p['IPL Team (2026)'] || p.Team || p.IPL_Team}`);
    } else {
        console.log(`${name}: NOT FOUND`);
    }
});
