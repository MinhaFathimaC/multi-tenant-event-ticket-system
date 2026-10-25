import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import api from '../services/api.js';
import { useAuth } from './AuthContext.jsx';
import confetti from 'canvas-confetti';

const ReservationContext = createContext();

export function ReservationProvider({ children }) {
  const { user } = useAuth();
  const [activeReservation, setActiveReservation] = useState(null);
  const [remainingSeconds, setRemainingSeconds] = useState(0);
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
  const [confirmedOrder, setConfirmedOrder] = useState(null);
  const [isConfirmedModalOpen, setIsConfirmedModalOpen] = useState(false);
  const [toast, setToast] = useState(null);
  const timerRef = useRef(null);

  const showToast = (message, type = 'info') => {
    setToast({ message, type, id: Date.now() });
    setTimeout(() => {
      setToast((prev) => (prev?.message === message ? null : prev));
    }, 4500);
  };

  // Poll for user's active reservation on login or switch
  useEffect(() => {
    if (!user) {
      setActiveReservation(null);
      setRemainingSeconds(0);
      return;
    }

    async function checkActive() {
      try {
        const res = await api.getActiveReservation();
        if (res.reservation && res.reservation.status === 'HELD' && res.reservation.remaining_seconds > 0) {
          setActiveReservation(res.reservation);
          setRemainingSeconds(res.reservation.remaining_seconds);
        } else {
          setActiveReservation(null);
          setRemainingSeconds(0);
        }
      } catch (err) {
        // ignore
      }
    }

    checkActive();
  }, [user]);

  // Countdown timer interval
  useEffect(() => {
    if (timerRef.current) clearInterval(timerRef.current);

    if (activeReservation && remainingSeconds > 0) {
      timerRef.current = setInterval(() => {
        setRemainingSeconds((prev) => {
          if (prev <= 1) {
            clearInterval(timerRef.current);
            setActiveReservation(null);
            showToast('Your 10-minute hold has expired! Reserved tickets were returned to the pool.', 'warning');
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [activeReservation]);

  // Hold tickets
  const holdTickets = async (eventId, tierId, quantity) => {
    try {
      const res = await api.holdTickets(eventId, tierId, quantity);
      setActiveReservation(res.reservation);
      setRemainingSeconds(res.reservation.remaining_seconds || 600);
      setIsCheckoutOpen(true);
      showToast(`Reserved ${quantity} ticket(s)! 10-minute temporary hold placed.`, 'success');
      return res.reservation;
    } catch (err) {
      showToast(err.message, 'error');
      throw err;
    }
  };

  // Cancel hold
  const releaseHold = async () => {
    if (!activeReservation) return;
    try {
      await api.cancelReservation(activeReservation.id);
      setActiveReservation(null);
      setRemainingSeconds(0);
      setIsCheckoutOpen(false);
      showToast('Hold released. Tickets returned to inventory.', 'info');
    } catch (err) {
      showToast(err.message, 'error');
    }
  };

  // Simulate Payment & Complete Order
  const processCheckout = async (action = 'APPROVE', cardDetails = {}) => {
    if (!activeReservation) throw new Error('No active reservation hold to checkout.');

    try {
      const result = await api.simulatePayment({
        reservationId: activeReservation.id,
        action,
        cardDetails
      });

      if (action === 'APPROVE' && result.success) {
        // Trigger celebratory confetti
        confetti({
          particleCount: 120,
          spread: 80,
          origin: { y: 0.6 }
        });

        setConfirmedOrder(result.order);
        setActiveReservation(null);
        setRemainingSeconds(0);
        setIsCheckoutOpen(false);
        setIsConfirmedModalOpen(true);
        showToast('Payment confirmed! Ticket passes generated.', 'success');
        return result.order;
      } else {
        // Declined or timeout
        setActiveReservation(null);
        setRemainingSeconds(0);
        setIsCheckoutOpen(false);
        showToast(result.message || 'Payment simulation declined.', 'error');
        return result;
      }
    } catch (err) {
      showToast(err.message, 'error');
      throw err;
    }
  };

  return (
    <ReservationContext.Provider
      value={{
        activeReservation,
        remainingSeconds,
        isCheckoutOpen,
        setIsCheckoutOpen,
        confirmedOrder,
        setConfirmedOrder,
        isConfirmedModalOpen,
        setIsConfirmedModalOpen,
        toast,
        showToast,
        holdTickets,
        releaseHold,
        processCheckout
      }}
    >
      {children}
    </ReservationContext.Provider>
  );
}

export function useReservation() {
  return useContext(ReservationContext);
}
