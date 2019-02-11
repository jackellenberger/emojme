const winston = require('winston');

const logger = winston.createLogger({
  levels: winston.config.syslog.levels,
  transports: [
    // console log anything warning or worse
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.simple(),
      ),
      colorize: true,
      level: 'warning',
    }),
    // log everything to a file
    new winston.transports.File({
      filename: 'log/combined.log',
      prettyPrint: true,
      timestamp: true,
      level: 'debug',
    }),
  ],
});

module.exports = logger;
