import { registerAs } from '@nestjs/config';

export default registerAs('egov', () => ({
  host: process.env.EGOV_MYSQL_HOST || 'mysql.konaweselatankab.go.id',
  user: process.env.EGOV_MYSQL_USER || 'diskominfosandi',
  password: process.env.EGOV_MYSQL_PASSWORD || 'NewKominfo2018',
  port: parseInt(process.env.EGOV_MYSQL_PORT || '3306', 10),
  connectionLimit: parseInt(process.env.EGOV_MYSQL_LIMIT || '20', 10),
}));
