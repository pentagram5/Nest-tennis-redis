import * as moment from 'moment-timezone';

export function generateWeekSchedule(): Record<string, Record<string, number>> {
  const today = moment().tz('Asia/Seoul').add(1, 'days').startOf('day'); // 오늘 날짜 기준 +1일을 시작점으로 설정 (KST)

  // 시작 시간(0700)과 끝 시간(2300) 설정
  const startHour = 7;
  const endHour = 22;
  const interval = 30; // 30분 간격

  const weekSchedule: Record<string, Record<string, number>> = {};

  // 일주일 동안 반복
  for (let i = 0; i < 7; i++) {
    const currentDate = today.clone().add(i, 'days'); // 일주일 동안 날짜 생성
    const currentDay = currentDate.format('YYYY-MM-DD'); // 날짜 형식: 'YYYY-MM-DD'

    // 각 날짜에 대한 시간대 객체 생성
    const daySchedule: Record<string, number> = {};

    // 시간대 생성 (0700 ~ 2300)
    for (let hour = startHour; hour <= endHour; hour++) {
      for (let minute = 0; minute < 60; minute += interval) {
        const timeKey = currentDate
          .hour(hour)
          .minute(minute)
          .format('HH:mm:ss'); // 'HH:mm' 형식으로 시간 키 생성

        // 평일인지 주말인지 구분
        const isWeekend = currentDate.day() === 0 || currentDate.day() === 6; // 일요일(0) 또는 토요일(6)
        const value = isWeekend ? 3 : 5; // 주말일 경우 3, 평일일 경우 5

        // 해당 시간대의 값 설정
        daySchedule[timeKey] = value;
      }
    }

    // 해당 날짜의 시간대 객체를 주 객체에 추가
    weekSchedule[currentDay] = daySchedule;
  }

  return weekSchedule;
}

// 오늘 날짜 기준 다음날부터 7일 return startDate, endDate
export function getDateRange(): { startDate: string; endDate: string } {
  const today = moment().tz('Asia/Seoul').startOf('day'); // 오늘 날짜 (자정)
  const startDate = today.add(1, 'days').format('YYYY-MM-DD'); // 내일
  const endDate = today.add(6, 'days').format('YYYY-MM-DD'); // 일주일 후
  return { startDate, endDate };
}

// 현재시간 기준(한시간 레슨 필요시) 30분 이후의 타임 스트링 리턴
export function getTimeAfter(startTime: string) {
  let currentTime = startTime;
  let [hours, minutes, seconds] = currentTime.split(':').map(Number);
  minutes += 30;

  if (minutes >= 60) {
    minutes -= 60;
    hours += 1;
  }
  currentTime = `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  return currentTime;
}

// 목표 요일 인덱스 기준 오늘 이후 해당 요일 날짜 리턴
export function getClosestWeekday(targetDay: number) {
  const today = moment.tz('Asia/Seoul');
  const startOfWeek = today.add(1, 'days');
  const currentDay = startOfWeek.day();
  let daysToTarget = targetDay - currentDay;
  if (daysToTarget < 0) {
    daysToTarget += 7;
  }
  const closestDay = startOfWeek.add(daysToTarget, 'days');
  return closestDay.format('YYYY-MM-DD');
}

// 레슨 시작 시간 대비 종료시간 계산 및 리턴
export function calculateEndTime(startTime: string, duration: number): string {
  const endTime = moment(startTime, 'HH:mm:ss').add(duration, 'minutes');
  return endTime.format('HH:mm:ss');
}

// 오늘 날짜 리턴
export function getTodayWeekdayIndex(): number {
  // 한국 시간(KST) 기준으로 오늘 날짜
  const today = moment.tz('Asia/Seoul');

  // 요일 인덱스 반환 (일요일: 0, 월요일: 1, ..., 토요일: 6)
  return today.day();
}
