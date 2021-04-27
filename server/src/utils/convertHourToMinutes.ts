export default function convertHourToMinutes(time: string) {
  const [hour, minutes] = time.split(':').map(Number); //descontrução para hora e minuto
  const timeInMinutes = (hour * 60) + minutes;

  return timeInMinutes;
}