require('dotenv').config({ path: '../../.env' });
const bcrypt = require('bcryptjs');
const supabase = require('../config/database');

async function seed() {
  console.log('Seeding database...');

  const password_hash = await bcrypt.hash(process.env.ADMIN_PASSWORD || 'Admin@123', 10);

  const { data, error } = await supabase.from('users').upsert({
    name: 'Administrador',
    email: process.env.ADMIN_EMAIL || 'admin@livereality.com',
    password_hash,
    is_admin: true,
    is_active: true
  }, { onConflict: 'email' }).select().single();

  if (error) {
    console.error('Error creating admin:', error);
  } else {
    console.log('Admin created:', data.email);
  }

  console.log('Seed complete!');
  process.exit(0);
}

seed();
