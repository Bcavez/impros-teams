#!/usr/bin/env node

import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

console.log('🚀 Setting up Supabase for Team Management PWA...\n')

// Check if .env file exists
const envPath = path.join(__dirname, '.env')
if (!fs.existsSync(envPath)) {
  console.log('📝 Creating .env file...')
  const envContent = `# Supabase Configuration
VITE_SUPABASE_URL=your_supabase_project_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
`
  fs.writeFileSync(envPath, envContent)
  console.log('✅ .env file created! Please update it with your Supabase credentials.\n')
} else {
  console.log('✅ .env file already exists.\n')
}

// Check if supabase directory exists
const supabasePath = path.join(__dirname, 'supabase')
if (!fs.existsSync(supabasePath)) {
  console.log('📁 Creating supabase directory...')
  fs.mkdirSync(supabasePath)
  fs.mkdirSync(path.join(supabasePath, 'migrations'))
  console.log('✅ Supabase directory structure created!\n')
} else {
  console.log('✅ Supabase directory already exists.\n')
}

console.log('📋 Next steps:')
console.log('1. Create a Supabase project at https://supabase.com')
console.log('2. Update your .env file with your project URL and anon key')
console.log('3. Run the SQL migration from supabase/migrations/001_initial_schema.sql in your Supabase dashboard')
console.log('4. Start your development server with: npm run dev')
console.log('5. Test the integration by logging in with: admin@example.com\n')

console.log('📚 For detailed instructions, see SUPABASE_SETUP.md')
console.log('🐛 If you encounter issues, check the troubleshooting section in the setup guide.\n')

console.log('🎉 Setup complete! Happy coding! 🎉')
