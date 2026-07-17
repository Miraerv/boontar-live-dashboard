import {
  PackagePlus, // создан
  PackageOpen, // сборка
  Package, // упакован
  PaperBag, // взят
  Motorbike, // доставляется
  Target, // почти прибыл
} from '@lucide/vue'

/** Kanban columns for the live orders board */
export const STATUSES = [
  { key: 'created', label: 'Создан', icon: PackagePlus, color: 'var(--blue)' },
  { key: 'assembly', label: 'Сборка', icon: PackageOpen, color: 'var(--orange)' },
  { key: 'packed', label: 'Упакован', icon: Package, color: 'var(--green)' },
  { key: 'taken', label: 'Взят', icon: PaperBag, color: 'var(--purple)' },
  { key: 'delivering', label: 'Доставляется', icon: Motorbike, color: 'var(--red)' },
  { key: 'almost', label: 'Почти прибыл', icon: Target, color: 'var(--pink)' },
]
