import postgres from 'postgres';
import fs from 'fs';

const seedStudents = JSON.parse(fs.readFileSync('./api/data/students-seed.json', 'utf-8'));

const connectionString = process.env.DATABASE_URL;
const sql = postgres(connectionString);

async function setupDatabase() {
  console.log('Creating tables...');
  
  // 创建 students 表
  await sql`
    CREATE TABLE IF NOT EXISTS students (
      id text PRIMARY KEY,
      student_id text NOT NULL,
      name text NOT NULL,
      class_name text NOT NULL,
      password text NOT NULL,
      courses_json text NOT NULL,
      query_enabled boolean DEFAULT true NOT NULL,
      created_at timestamp DEFAULT now() NOT NULL,
      updated_at timestamp DEFAULT now() NOT NULL
    )
  `;
  
  // 创建 system_settings 表
  await sql`
    CREATE TABLE IF NOT EXISTS system_settings (
      id serial PRIMARY KEY,
      key text UNIQUE NOT NULL,
      value text NOT NULL,
      updated_at timestamp DEFAULT now() NOT NULL
    )
  `;
  
  // 创建 audit_logs 表
  await sql`
    CREATE TABLE IF NOT EXISTS audit_logs (
      id serial PRIMARY KEY,
      timestamp timestamp DEFAULT now() NOT NULL,
      ip text NOT NULL,
      action text NOT NULL,
      target text,
      status text NOT NULL,
      details text,
      user_agent text
    )
  `;
  
  // 创建 ip_rate_limits 表
  await sql`
    CREATE TABLE IF NOT EXISTS ip_rate_limits (
      id serial PRIMARY KEY,
      ip text UNIQUE NOT NULL,
      failed_attempts integer DEFAULT 0 NOT NULL,
      last_attempt timestamp DEFAULT now() NOT NULL,
      blocked_until timestamp
    )
  `;
  
  console.log('Tables created successfully!');
  
  // 插入默认系统设置
  const defaultSettings = {
    allow_query: "true",
    announcement: "2024-2025学年第二学期期末成绩已发布，请各位同学输入准确的班级、姓名及出生年月（8位）进行查询。",
    maintenance_reason: "系统正在进行成绩复核与安全维护，成绩查询通道暂时关闭，请稍后再试。",
    allowed_classes: "ALL",
    rate_limit_max_attempts: "5",
    rate_limit_lockout_minutes: "15",
  };
  
  for (const [key, value] of Object.entries(defaultSettings)) {
    await sql`
      INSERT INTO system_settings (key, value)
      VALUES (${key}, ${value})
      ON CONFLICT (key) DO NOTHING
    `;
  }
  
  console.log('Default settings inserted!');
  
  // 检查学生数据是否已存在
  const countResult = await sql`SELECT count(*) as count FROM students`;
  const count = Number(countResult[0].count);
  
  if (count === 0 && seedStudents && seedStudents.length > 0) {
    console.log(`Seeding ${seedStudents.length} student records...`);
    
    // 批量插入，每批50条
    const chunkSize = 50;
    for (let i = 0; i < seedStudents.length; i += chunkSize) {
      const chunk = seedStudents.slice(i, i + chunkSize);
      const values = chunk.map(s => ({
        id: s.id,
        student_id: s.studentId,
        name: s.name,
        class_name: s.className,
        password: s.password,
        courses_json: JSON.stringify(s.courses),
        query_enabled: true,
      }));
      
      await sql`
        INSERT INTO students ${sql(values, 'id', 'student_id', 'name', 'class_name', 'password', 'courses_json', 'query_enabled')}
        ON CONFLICT (id) DO NOTHING
      `;
      
      console.log(`  Inserted ${Math.min(i + chunkSize, seedStudents.length)} / ${seedStudents.length}`);
    }
    
    console.log('Students seeded successfully!');
  } else {
    console.log(`Students table already has ${count} records, skipping seed.`);
  }
  
  console.log('Database setup complete!');
  await sql.end();
}

setupDatabase().catch(err => {
  console.error('Error setting up database:', err);
  process.exit(1);
});
