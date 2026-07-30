/**
 * A quick-fill catalogue of makes and models available on Australian roads,
 * biased toward the vehicles a courier/delivery fleet actually runs (vans,
 * utes and light/medium trucks) but covering the mainstream passenger market
 * too. It is deliberately broad rather than exhaustively VIN-complete — every
 * field on the asset form stays free-text, so anything not listed here can
 * still be typed in. Kept as plain data so it's trivial to extend.
 *
 * Sources: current + recent Australian-market model line-ups across passenger,
 * SUV, light-commercial and truck brands. Historic-but-still-on-the-road makes
 * (Holden, Ford Falcon-era) are included because fleets keep older assets.
 */
export interface VehicleMake {
  make: string;
  models: string[];
}

export const AUSTRALIAN_VEHICLES: VehicleMake[] = [
  // --- Light commercial / fleet workhorses first (most relevant to couriers) ---
  { make: 'Toyota', models: ['HiAce', 'HiAce Commuter', 'HiLux', 'LandCruiser 70 Series', 'LandCruiser 300', 'LandCruiser Prado', 'Corolla', 'Camry', 'RAV4', 'Kluger', 'Yaris', 'Yaris Cross', 'Corolla Cross', 'Fortuner', 'Granvia', 'C-HR', 'BZ4X', 'Coaster'] },
  { make: 'Ford', models: ['Transit', 'Transit Custom', 'Transit Cab Chassis', 'Ranger', 'Ranger Raptor', 'Everest', 'Escape', 'Puma', 'Focus', 'Falcon', 'Territory', 'Mustang', 'Mustang Mach-E'] },
  { make: 'Hyundai', models: ['iLoad', 'iMax', 'Staria', 'Staria Load', 'i30', 'Tucson', 'Santa Fe', 'Kona', 'Venue', 'Palisade', 'Ioniq 5', 'Ioniq 6', 'Accent', 'Elantra'] },
  { make: 'LDV', models: ['G10', 'G10+', 'V80', 'Deliver 9', 'eDeliver 9', 'eDeliver 7', 'D90', 'T60', 'T60 Max', 'Mifa', 'Mifa 9'] },
  { make: 'Renault', models: ['Kangoo', 'Kangoo E-Tech', 'Trafic', 'Master', 'Master E-Tech', 'Arkana', 'Koleos', 'Captur', 'Megane E-Tech'] },
  { make: 'Volkswagen', models: ['Transporter', 'Caddy', 'Crafter', 'Amarok', 'Multivan', 'ID. Buzz', 'Golf', 'Polo', 'Tiguan', 'T-Cross', 'T-Roc', 'Touareg', 'ID.4', 'ID.5'] },
  { make: 'Mercedes-Benz', models: ['Sprinter', 'Vito', 'V-Class', 'eSprinter', 'eVito', 'Citan', 'X-Class', 'A-Class', 'C-Class', 'E-Class', 'GLA', 'GLC', 'GLE', 'EQA', 'EQB', 'EQC', 'EQE', 'EQS'] },
  { make: 'Fiat', models: ['Ducato', 'Scudo', 'Doblo', 'E-Ducato', '500', '500e', 'Abarth 500'] },
  { make: 'Peugeot', models: ['Partner', 'Expert', 'Boxer', 'e-Partner', 'e-Expert', '2008', '3008', '5008', '308', '408'] },
  { make: 'Isuzu', models: ['N Series (NLR)', 'N Series (NPR)', 'N Series (NQR)', 'F Series (FRR)', 'F Series (FSR)', 'F Series (FVR)', 'F Series (FVZ)', 'Giga', 'Traviz'] },
  { make: 'Isuzu Ute', models: ['D-Max', 'MU-X'] },
  { make: 'Hino', models: ['300 Series', '500 Series', '700 Series', 'Dutro'] },
  { make: 'Fuso', models: ['Canter', 'eCanter', 'Fighter', 'Shogun', 'Rosa'] },
  { make: 'Iveco', models: ['Daily', 'Daily 4x4', 'eDaily', 'Eurocargo', 'Stralis', 'S-Way', 'Powerstar'] },

  // --- Utes & 4x4s common in mixed fleets ---
  { make: 'Mitsubishi', models: ['Triton', 'Pajero Sport', 'Pajero', 'Outlander', 'ASX', 'Eclipse Cross', 'Express'] },
  { make: 'Nissan', models: ['Navara', 'Patrol', 'X-Trail', 'Qashqai', 'Pathfinder', 'Juke', 'Leaf', 'Ariya'] },
  { make: 'Mazda', models: ['BT-50', 'CX-3', 'CX-30', 'CX-5', 'CX-60', 'CX-8', 'CX-9', 'CX-90', 'Mazda2', 'Mazda3', 'Mazda6', 'MX-5'] },
  { make: 'GWM', models: ['Ute (Cannon)', 'Cannon Alpha', 'Haval H6', 'Haval Jolion', 'Tank 300', 'Tank 500', 'Ora'] },
  { make: 'SsangYong', models: ['Musso', 'Musso XLV', 'Rexton', 'Korando', 'Torres'] },
  { make: 'RAM', models: ['1500', '2500', '3500'] },
  { make: 'Chevrolet', models: ['Silverado 1500', 'Silverado 2500 HD', 'Silverado HD'] },

  // --- Mainstream passenger / SUV ---
  { make: 'Kia', models: ['Carnival', 'Sportage', 'Sorento', 'Cerato', 'Seltos', 'Stonic', 'Picanto', 'Niro', 'EV5', 'EV6', 'EV9', 'Rio'] },
  { make: 'Subaru', models: ['Forester', 'Outback', 'XV', 'Crosstrek', 'Impreza', 'WRX', 'Solterra', 'Liberty', 'BRZ'] },
  { make: 'Honda', models: ['CR-V', 'HR-V', 'ZR-V', 'Civic', 'Accord', 'Odyssey'] },
  { make: 'MG', models: ['MG3', 'MG4', 'MG5', 'ZS', 'ZS EV', 'HS', 'MG6', 'Cyberster'] },
  { make: 'Suzuki', models: ['Swift', 'Baleno', 'Ignis', 'Vitara', 'S-Cross', 'Jimny', 'Jimny XL'] },
  { make: 'Skoda', models: ['Octavia', 'Superb', 'Scala', 'Kamiq', 'Karoq', 'Kodiaq', 'Enyaq'] },
  { make: 'BYD', models: ['Atto 3', 'Dolphin', 'Seal', 'Sealion 6', 'Sealion 7', 'Shark 6'] },
  { make: 'Tesla', models: ['Model 3', 'Model Y', 'Model S', 'Model X'] },
  { make: 'Holden', models: ['Commodore', 'Colorado', 'Astra', 'Trax', 'Trailblazer', 'Acadia', 'Captiva', 'Barina'] },

  // --- Premium / European ---
  { make: 'BMW', models: ['1 Series', '2 Series', '3 Series', '4 Series', '5 Series', 'X1', 'X3', 'X5', 'X7', 'iX', 'i4', 'i5', 'i7'] },
  { make: 'Audi', models: ['A1', 'A3', 'A4', 'A5', 'A6', 'Q2', 'Q3', 'Q5', 'Q7', 'Q8', 'e-tron', 'Q4 e-tron', 'Q8 e-tron'] },
  { make: 'Volvo', models: ['XC40', 'XC60', 'XC90', 'S60', 'S90', 'V60', 'EX30', 'EX40', 'EC40', 'FH', 'FM', 'FL', 'FE'] },
  { make: 'Lexus', models: ['UX', 'NX', 'RX', 'RZ', 'ES', 'LX', 'IS', 'LM'] },
  { make: 'Land Rover', models: ['Defender', 'Discovery', 'Discovery Sport', 'Range Rover', 'Range Rover Sport', 'Range Rover Evoque', 'Range Rover Velar'] },
  { make: 'Jeep', models: ['Wrangler', 'Gladiator', 'Grand Cherokee', 'Compass', 'Avenger'] },
  { make: 'Genesis', models: ['G70', 'G80', 'GV60', 'GV70', 'GV80'] },
  { make: 'Porsche', models: ['Macan', 'Cayenne', 'Panamera', '911', 'Taycan', '718 Cayman', '718 Boxster'] },
  { make: 'Mini', models: ['Cooper', 'Countryman', 'Clubman', 'Aceman'] },
  { make: 'Cupra', models: ['Leon', 'Formentor', 'Born', 'Ateca', 'Tavascan'] },
  { make: 'Polestar', models: ['Polestar 2', 'Polestar 3', 'Polestar 4'] },
  { make: 'Jaguar', models: ['E-Pace', 'F-Pace', 'I-Pace', 'XE', 'XF', 'F-Type'] },
  { make: 'Alfa Romeo', models: ['Giulia', 'Stelvio', 'Tonale'] },

  // --- Heavy trucks (prime movers / rigids for larger fleets) ---
  { make: 'Kenworth', models: ['K200', 'K220', 'T360', 'T410', 'T610', 'T659', 'T909', 'C509'] },
  { make: 'Volvo Trucks', models: ['FH', 'FH16', 'FM', 'FMX', 'FE', 'FL'] },
  { make: 'Scania', models: ['R Series', 'S Series', 'P Series', 'G Series', 'L Series', 'XT'] },
  { make: 'MAN', models: ['TGE', 'TGL', 'TGM', 'TGS', 'TGX'] },
  { make: 'DAF', models: ['LF', 'CF', 'XF', 'XD', 'XG'] },
  { make: 'Mack', models: ['Anthem', 'Trident', 'Superliner', 'Granite', 'Metro-Liner'] },
  { make: 'Freightliner', models: ['Cascadia', 'Coronado', 'Argosy'] },
  { make: 'Western Star', models: ['47X', '48X', '49X', '4800', '4900', '5800'] },
];

/** All makes, alphabetised for the dropdown (keeps the workhorse ordering out of the picker). */
export const AUSTRALIAN_VEHICLE_MAKES = [...AUSTRALIAN_VEHICLES]
  .map((v) => v.make)
  .sort((a, b) => a.localeCompare(b));

export function modelsForMake(make: string): string[] {
  return AUSTRALIAN_VEHICLES.find((v) => v.make === make)?.models ?? [];
}

/** Year options: this year + 1 (for pre-registered new stock) back to 1980. */
export function vehicleYearOptions(currentYear: number): number[] {
  const years: number[] = [];
  for (let y = currentYear + 1; y >= 1980; y--) years.push(y);
  return years;
}
