import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { mockLeads } from '@/lib/mock-data';

export function useLeads() {
  const [leads, setLeads] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Determine if we should use mock data (if env vars missing or requested)
    const useMock = !process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.NEXT_PUBLIC_USE_MOCK === 'true';

    if (useMock) {
      setLeads(mockLeads);
      setLoading(false);
      return;
    }

    const fetchLeads = async () => {
      try {
        const { data, error } = await supabase
          .from('leads')
          .select('*')
          .order('created_at', { ascending: false });

        if (error) {
          console.error('Error fetching leads:', error);
        } else {
          setLeads(data || []);
        }
      } catch (err) {
        console.error('Unexpected error fetching leads:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchLeads();

    // Set up Realtime subscription
    const channel = supabase
      .channel('public:leads')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'leads' },
        (payload) => {
          console.log('New lead received!', payload.new);
          setLeads((prev) => [payload.new, ...prev]);
        }
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'leads' },
        (payload) => {
          setLeads((prev) =>
            prev.map((lead) => (lead.id === payload.new.id ? payload.new : lead))
          );
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const updateLeadStatus = async (id, status) => {
    const useMock = !process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.NEXT_PUBLIC_USE_MOCK === 'true';

    if (useMock) {
      setLeads((prev) =>
        prev.map((lead) => (lead.id === id ? { ...lead, status } : lead))
      );
      return { success: true };
    }

    // Optimistic update
    setLeads((prev) =>
      prev.map((lead) => (lead.id === id ? { ...lead, status } : lead))
    );

    const { error } = await supabase
      .from('leads')
      .update({ status })
      .eq('id', id);

    if (error) {
      console.error('Error updating lead status:', error);
      // Optional: rollback optimistic update here
      return { success: false, error };
    }
    return { success: true };
  };

  const markAsRead = async (id) => {
    const useMock = !process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.NEXT_PUBLIC_USE_MOCK === 'true';

    if (useMock) {
      setLeads((prev) =>
        prev.map((lead) => (lead.id === id ? { ...lead, is_read: true } : lead))
      );
      return { success: true };
    }

    setLeads((prev) =>
      prev.map((lead) => (lead.id === id ? { ...lead, is_read: true } : lead))
    );

    const { error } = await supabase
      .from('leads')
      .update({ is_read: true })
      .eq('id', id);
      
    if (error) {
      console.error('Error marking lead as read:', error);
      return { success: false, error };
    }
    return { success: true };
  };

  return { leads, loading, updateLeadStatus, markAsRead };
}
