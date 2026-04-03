const { PrismaClient } = require('@prisma/client');
const XLSX = require('xlsx');
const path = require('path');

const prisma = new PrismaClient();

async function exportPlayersToExcel() {
  try {
    console.log('Fetching players from database...');
    const players = await prisma.player.findMany({
      select: {
        name: true,
        basePrice: true,
        iplTeam: true,
        role: true,
        type: true,
        country: true,
        number: true,
        auctionPrice: true,
      },
      orderBy: [
        { iplTeam: 'asc' },
        { basePrice: 'asc' },
        { name: 'asc' },
      ],
    });

    console.log(`Found ${players.length} players`);

    // Transform data for Excel
    const data = players.map(player => ({
      Name: player.name || '',
      'Base Price': player.basePrice || 'N/A',
      'IPL Team': player.iplTeam || '',
      Role: player.role || '',
      Type: player.type || '',
      Country: player.country || '',
      'Jersey Number': player.number || '',
      'Auction Price': player.auctionPrice || 'N/A',
    }));

    // Create workbook
    const ws = XLSX.utils.json_to_sheet(data);
    
    // Set column widths
    const colWidths = [
      { wch: 25 }, // Name
      { wch: 12 }, // Base Price
      { wch: 12 }, // IPL Team
      { wch: 12 }, // Role
      { wch: 12 }, // Type
      { wch: 12 }, // Country
      { wch: 12 }, // Jersey Number
      { wch: 12 }, // Auction Price
    ];
    ws['!cols'] = colWidths;

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Players');

    // Save file
    const timestamp = new Date().toISOString().split('T')[0];
    const filename = `players_baseprice_${timestamp}.xlsx`;
    const filepath = path.join(__dirname, '..', filename);
    
    XLSX.writeFile(wb, filepath);
    console.log(`✓ Excel file created: ${filename}`);

    // Print summary
    const priceSummary = {};
    players.forEach(p => {
      const price = p.basePrice || 'Unpriced';
      priceSummary[price] = (priceSummary[price] || 0) + 1;
    });

    console.log('\nBase Price Summary:');
    console.table(priceSummary);

    return filepath;
  } catch (error) {
    console.error('Error exporting players:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

exportPlayersToExcel();
