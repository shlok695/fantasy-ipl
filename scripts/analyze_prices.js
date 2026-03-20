const XLSX = require('xlsx');

function cleanText(value) {
  return typeof value === 'string' ? value.trim() : '';
}

function parsePriceToCrores(rawPrice) {
  const price = cleanText(rawPrice);
  if (!price || price === '-') return null;

  const numericValue = parseFloat(price.replace(/[^0-9.]/g, ''));
  if (Number.isNaN(numericValue)) return null;

  if (/lakh/i.test(price)) {
    return Number((numericValue / 100).toFixed(2));
  }

  return Number(numericValue.toFixed(2));
}

const filePath = 'e:/auction/auction_db_final.xlsx';
const wb = XLSX.readFile(filePath);
const ws = wb.Sheets[wb.SheetNames[0]];
const data = XLSX.utils.sheet_to_json(ws);

const prices = data.map(row => parsePriceToCrores(row['Price'])).filter(p => p !== null).sort((a, b) => b - a);

console.log('Total players with prices:', prices.length);
console.log('Max Price:', Math.max(...prices), 'Cr');
console.log('Min Price:', Math.min(...prices), 'Cr');

const brackets = [15, 10, 5, 4, 3, 2, 1, 0.5, 0];
const basePriceMap = {
    15: 2.0,
    10: 1.5,
    5: 1.0,
    4: 0.75,
    3: 0.5,
    2: 0.4,
    1: 0.3,
    0.5: 0.25,
    0: 0.2
};
const distribution = {};
brackets.forEach(b => distribution[b] = 0);

prices.forEach(p => {
    for (let b of brackets) {
        if (p >= b) { distribution[b]++; break; }
    }
});

console.log('Distribution by Proposed Base Price:');
brackets.forEach(b => {
    console.log(`Sold >= ${b} Cr -> Base ${basePriceMap[b]} Cr: ${distribution[b]} players`);
});

// Show top 20 players to see "capability"
console.log('\nTop 20 Players by Selling Price:');
data.sort((a, b) => (parsePriceToCrores(b['Price']) || 0) - (parsePriceToCrores(a['Price']) || 0))
    .slice(0, 20)
    .forEach(r => console.log(`${r['Player']}: ${r['Price']}`));
