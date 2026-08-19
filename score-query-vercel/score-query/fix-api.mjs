import fs from 'fs';
import path from 'path';

const apiDir = './api';
const files = ['admin-auth.mts', 'admin-logs.mts', 'admin-settings.mts', 'admin-students.mts', 'system-status.mts'];

for (const file of files) {
  const filePath = path.join(apiDir, file);
  let content = fs.readFileSync(filePath, 'utf-8');
  
  // 1. 移除Netlify的import
  content = content.replace(/import type \{ Config, Context \} from "@netlify\/functions";\n?/, '');
  
  // 2. 移除单独的Context import（如果有的话）
  content = content.replace(/import type \{ Context \} from "@netlify\/functions";\n?/, '');
  
  // 3. 修改函数签名，移除context参数
  content = content.replace(/\(req: Request, context: Context\)/g, '(req: Request)');
  
  // 4. 修改getClientIp调用，移除context参数
  content = content.replace(/getClientIp\(req, context\)/g, 'getClientIp(req)');
  
  // 5. 修改schema导入路径
  content = content.replace(/\.\.\/\.\.\/db\/schema\.js/g, '../db/schema.js');
  
  // 6. 移除底部的config导出
  content = content.replace(/export const config: Config = \{[\s\S]*?\};\n?$/, '');
  
  // 7. 在第一个import之后添加runtime声明
  const firstImportEnd = content.indexOf('\n', content.indexOf('import'));
  if (firstImportEnd !== -1) {
    content = content.slice(0, firstImportEnd + 1) + '\nexport const runtime = "edge";\n' + content.slice(firstImportEnd + 1);
  }
  
  fs.writeFileSync(filePath, content);
  console.log(`Fixed: ${file}`);
}

console.log('All API files fixed!');
