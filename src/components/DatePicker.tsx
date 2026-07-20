import React from 'react';
import ReactDatePicker from 'react-datepicker';
// @ts-ignore: allow importing CSS without type declarations
import 'react-datepicker/dist/react-datepicker.css';
import { Calendar } from 'lucide-react';

interface DatePickerProps {
  selected: Date | null;
  onChange: (date: Date | null) => void;
  placeholder?: string;
  required?: boolean;
  minDate?: Date;
}

export const DatePicker: React.FC<DatePickerProps> = ({
  selected,
  onChange,
  placeholder = 'Select date',
  required = false,
  minDate,
}) => {
  return (
    <div className="relative">
      <ReactDatePicker
        selected={selected}
        onChange={onChange}
        dateFormat="yyyy-MM-dd"
        placeholderText={placeholder}
        required={required}
        minDate={minDate}
        className="w-full px-3 py-2 text-sm rounded-lg pr-10"
        wrapperClassName="w-full"
        calendarClassName="custom-calendar"
      />
      <Calendar
        size={16}
        className="absolute right-3 top-1/2 transform -translate-y-1/2 pointer-events-none"
        style={{ color: '#9CA3AF' }}
      />
      <style>{`
        .react-datepicker {
          font-family: inherit;
          border: 1px solid #E5E7EB;
          border-radius: 12px;
          box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05);
        }

        .react-datepicker__header {
          background-color: #F9FAFB;
          border-bottom: 1px solid #E5E7EB;
          border-radius: 12px 12px 0 0;
          padding: 12px 0;
        }

        .react-datepicker__current-month {
          font-size: 0.875rem;
          font-weight: 600;
          color: #1F2937;
          margin-bottom: 8px;
        }

        .react-datepicker__day-name {
          color: #6B7280;
          font-size: 0.75rem;
          font-weight: 500;
          width: 2rem;
          line-height: 2rem;
          margin: 0.166rem;
        }

        .react-datepicker__day {
          width: 2rem;
          line-height: 2rem;
          margin: 0.166rem;
          color: #1F2937;
          font-size: 0.875rem;
          border-radius: 6px;
          transition: all 0.15s;
        }

        .react-datepicker__day:hover {
          background-color: #F3F4F6;
          color: #1F2937;
        }

        .react-datepicker__day--selected,
        .react-datepicker__day--keyboard-selected {
          background: linear-gradient(135deg, #4C5FD5 0%, #6366F1 100%);
          color: white;
          font-weight: 600;
        }

        .react-datepicker__day--selected:hover,
        .react-datepicker__day--keyboard-selected:hover {
          background: linear-gradient(135deg, #4338CA 0%, #4C5FD5 100%);
        }

        .react-datepicker__day--today {
          background-color: #EEF2FF;
          color: #4C5FD5;
          font-weight: 600;
        }

        .react-datepicker__day--outside-month {
          color: #D1D5DB;
        }

        .react-datepicker__day--disabled {
          color: #D1D5DB;
          cursor: not-allowed;
        }

        .react-datepicker__day--disabled:hover {
          background-color: transparent;
        }

        .react-datepicker__navigation {
          top: 14px;
        }

        .react-datepicker__navigation-icon::before {
          border-color: #6B7280;
          border-width: 2px 2px 0 0;
        }

        .react-datepicker__navigation:hover .react-datepicker__navigation-icon::before {
          border-color: #4C5FD5;
        }

        .react-datepicker__month {
          margin: 12px;
        }

        .react-datepicker__input-container input {
          width: 100%;
          padding: 0.5rem 0.75rem;
          font-size: 0.875rem;
          border-radius: 0.5rem;
          border: 1px solid #E5E7EB;
          color: #1F2937;
          background-color: #ffffff;
          transition: all 0.2s;
        }

        .react-datepicker__input-container input:focus {
          outline: none;
          border-color: #4C5FD5;
          box-shadow: 0 0 0 3px rgba(76, 95, 213, 0.1);
        }

        .react-datepicker__input-container input::placeholder {
          color: #9CA3AF;
        }
      `}</style>
    </div>
  );
};
