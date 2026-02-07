import { Timestamp } from "firebase/firestore";

export interface Stock {
    count: number;
    label: string;
}

export interface DeliverySettings {
    next_date: Timestamp;
    cycle_days: number;
}
