import { Database } from 'bun:sqlite'

const db = new Database('/home/z/my-project/db/custom.db')

const tables = [
  'User',
  'Course',
  'Material',
  'Quiz',
  'Question',
  'Enrollment',
  'Project',
  'Invoice',
  'InvoiceHistory',
  'Notification',
]

// Columns that are timestamps (epoch ms in SQLite -> TIMESTAMP in PostgreSQL)
const timestampColumns = new Set([
  'createdAt',
  'updatedAt',
  'lastLoginAt',
  'enrolledAt',
  'completedAt',
  'lastAccessedAt',
  'startedAt',
  'completedAt',
  'invoiceDate',
  'dueDate',
  'approvedAt',
  'paidAt',
  'startDate',
  'endDate',
])

const sqlLines: string[] = []
sqlLines.push('-- Seed data for LMS-ITS PERKESO (Supabase PostgreSQL)')
sqlLines.push('-- Auto-generated from SQLite dummy database')
sqlLines.push('-- Timestamps converted from epoch ms to PostgreSQL TIMESTAMP')
sqlLines.push('')
sqlLines.push('-- Temporarily disable FK constraints for clean insertion order')
sqlLines.push("SET session_replication_role = 'replica';")
sqlLines.push('')

function getColumns(table: string) {
  return db.prepare(`PRAGMA table_info(${table})`).all() as Array<{
    name: string
    type: string
  }>
}

for (const table of tables) {
  const cols = getColumns(table)
  if (cols.length === 0) continue

  const colNames = cols.map((c) => c.name)
  const colTypes = new Map(cols.map((c) => [c.name, c.type.toUpperCase()]))

  const rows = db.prepare(`SELECT * FROM ${table}`).all() as Record<string, any>[]
  if (rows.length === 0) continue

  sqlLines.push(`-- ${table} (${rows.length} records)`)

  for (const row of rows) {
    const values = colNames.map((col) => {
      const v = row[col]
      const type = colTypes.get(col) || ''

      if (v === null || v === undefined) return 'NULL'

      // Timestamp columns — convert epoch ms to PostgreSQL timestamp
      if (timestampColumns.has(col)) {
        const ms = typeof v === 'number' ? v : parseInt(String(v), 10)
        if (!isNaN(ms)) {
          // Use to_timestamp which returns timestamptz
          return `to_timestamp(${ms} / 1000.0)`
        }
        return 'NULL'
      }

      // Numeric types
      if (type === 'INTEGER' || type === 'REAL' || type === 'NUMERIC') {
        if (typeof v === 'number') return String(v)
        const s = String(v)
        if (/^-?\d+(\.\d+)?$/.test(s)) return s
      }

      // Boolean
      if (type === 'BOOLEAN' || typeof v === 'boolean') {
        return v ? 'true' : 'false'
      }

      // Text — escape single quotes
      return `'${String(v).replace(/'/g, "''")}'`
    })
    sqlLines.push(
      `INSERT INTO "${table}" ("${colNames.join('", "')}") VALUES (${values.join(', ')});`,
    )
  }
  sqlLines.push('')
}

sqlLines.push("SET session_replication_role = 'origin';")
sqlLines.push('')
sqlLines.push('-- Seed complete! LMS-ITS PERKESO dummy data loaded.')
sqlLines.push('--')
sqlLines.push('-- Login credentials:')
sqlLines.push('--   admin@perkeso.gov.my / admin123 (Pentadbir Sistem)')
sqlLines.push('--   pm@perkeso.gov.my / pm123 (Pengurus Projek)')
sqlLines.push('--   padmin@perkeso.gov.my / padmin123 (Pentadbir Projek)')
sqlLines.push('--   staff1@perkeso.gov.my / staff123 (Peserta Latihan)')
sqlLines.push('--   upper@perkeso.gov.my / upper123 (Pengurusan Atasan)')

console.log(sqlLines.join('\n'))
db.close()
