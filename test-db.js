// Quick test to see if Prisma can connect
const { PrismaClient } = require('./src/generated/prisma')

console.log('DATABASE_URL:', process.env.DATABASE_URL)
console.log('Creating Prisma client...')

try {
  const prisma = new PrismaClient()
  console.log('Prisma client created successfully!')
  
  prisma.user.findMany()
    .then(users => {
      console.log('Users found:', users.length)
      users.forEach(u => console.log('  -', u.email, '('+u.role+')'))
      prisma.$disconnect()
    })
    .catch(err => {
      console.error('Error querying users:', err.message)
      prisma.$disconnect()
    })
} catch (err) {
  console.error('Error creating Prisma client:', err.message)
}

