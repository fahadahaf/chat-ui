/**
 * Script to manually add users to the database
 * Usage: pnpm tsx scripts/add-user.ts
 */

import { createUser } from '../src/lib/server/db'
import bcrypt from 'bcryptjs'

async function addUser() {
  // Configuration - Edit these values
  const userData = {
    email: 'admin@example.com',
    password: 'changeme123', // Change this!
    name: 'Admin User',
    role: 'admin' as const // 'admin' or 'user'
  }

  try {
    console.log('Creating user...')
    const hash = await bcrypt.hash(userData.password, 10)
    
    const user = await createUser({
      email: userData.email,
      password_hash: hash,
      name: userData.name,
      role: userData.role
    })

    console.log('✅ User created successfully!')
    console.log('User ID:', user.id)
    console.log('Email:', user.email)
    console.log('Role:', user.role)
    console.log('\nYou can now login with:')
    console.log(`  Email: ${user.email}`)
    console.log(`  Password: ${userData.password}`)
  } catch (error) {
    console.error('❌ Error creating user:', error)
    process.exit(1)
  }
}

addUser()

