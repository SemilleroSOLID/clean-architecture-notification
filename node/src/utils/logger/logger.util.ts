import { createLogger, format, transports } from "winston";
import { TransformableInfo } from "logform";

const { combine, timestamp, prettyPrint, colorize, align, printf } = format;

const logger = createLogger({
  format: combine(
    colorize(),
    timestamp(),
    prettyPrint(),
    align(),
    printf((info) => printFormat(info))
  ),
  exitOnError: false,
});

logger.add(new transports.Console());

const getLogType = (message: any) => {
  const status = Number(message.split("=").pop().replace(/ .*/, ""));
  if (status < 400 || isNaN(status)) {
    return "info";
  }

  return "error";
};

const printFormat = (info: TransformableInfo) => {
  // tslint:disable-next-line: no-shadowed-variable
  const { timestamp, level, message, ...args } = info;
  const ts = timestamp.slice(0, 19).replace("T", " ");

  return `[${level}]: ${ts} ${message} ${
    Object.keys(args).length ? JSON.stringify(args, null, 2) : ""
  }`;
};

export const stream = {
  write: (message: any) => {
    const type = getLogType(message);

    logger.log({ level: type, message });
  },
};

export default logger;
