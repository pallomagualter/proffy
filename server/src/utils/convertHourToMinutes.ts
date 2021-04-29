export default function convertHourToMinutes(time: string) {
  const [hour, minutes] = time.split(':').map(Number); //descontrução para hora e minuto com split no : e o map transformando em tipo number
  const timeInMinutes = (hour * 60) + minutes;

  return timeInMinutes;
}