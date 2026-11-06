import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

/** 클래스 이름을 합친다. 겹치는 Tailwind 클래스는 뒤의 것이 이긴다 (shadcn 컴포넌트가 쓴다) */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}
