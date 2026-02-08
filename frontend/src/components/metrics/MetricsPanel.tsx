import { useState, useEffect } from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import type { Event } from '../../types';
import { getEvents, getLikedTrackIds } from '../../api/musicApi';
import Surface from '../common/Surface';
import './MetricsPanel.css';

interface MetricsPanelProps {
  userId: number;
}

export default function MetricsPanel({ userId }: MetricsPanelProps) {
  const [events, setEvents] = useState<Event[]>([]);
  const [likedSongsCount, setLikedSongsCount] = useState<number>(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, [userId]);

  const fetchData = async () => {
    try {
      // Fetch events and liked songs in parallel
      const [eventsData, likedTrackIds] = await Promise.all([
        getEvents(userId),
        getLikedTrackIds()
      ]);
      setEvents(Array.isArray(eventsData) ? eventsData : []);
      setLikedSongsCount(Array.isArray(likedTrackIds) ? likedTrackIds.length : 0);
    } catch (error) {
      console.error('Failed to fetch data:', error);
      setEvents([]);
      setLikedSongsCount(0);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Surface variant="raised" padding="lg" className="metrics-panel">
        <div className="metrics-panel__loading">Loading metrics...</div>
      </Surface>
    );
  }

  // Calculate stats
  const totalPlays = events.filter((e) => e.event_type === 'play').length;
  const totalSkips = events.filter((e) => e.event_type === 'skip').length;
  const totalDuration = events.reduce((sum, e) => sum + e.listened_duration, 0);
  const avgDuration = totalPlays > 0 ? totalDuration / totalPlays : 0;

  // Event type distribution for chart
  const eventTypeCounts = events.reduce((acc, event) => {
    acc[event.event_type] = (acc[event.event_type] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const chartData = Object.entries(eventTypeCounts).map(([type, count]) => ({
    type,
    count,
  }));

  return (
    <Surface variant="raised" padding="lg" className="metrics-panel">
      <h2 className="metrics-panel__title">Session Metrics</h2>

      <div className="metrics-panel__stats">
        <div className="metric-card">
          <div className="metric-card__value">{totalPlays}</div>
          <div className="metric-card__label">Total Plays</div>
        </div>

        <div className="metric-card">
          <div className="metric-card__value">{Math.round(avgDuration)}s</div>
          <div className="metric-card__label">Avg Duration</div>
        </div>

        <div className="metric-card">
          <div className="metric-card__value">{likedSongsCount}</div>
          <div className="metric-card__label">Liked Songs</div>
        </div>

        <div className="metric-card">
          <div className="metric-card__value">{totalSkips}</div>
          <div className="metric-card__label">Skips</div>
        </div>
      </div>

      {chartData.length > 0 && (
        <div className="metrics-panel__chart">
          <h3 className="metrics-panel__chart-title">Event Distribution</h3>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={chartData}>
              <XAxis dataKey="type" stroke="var(--color-text-secondary)" />
              <YAxis stroke="var(--color-text-secondary)" />
              <Tooltip
                cursor={{ fill: 'var(--glow-secondary)' }}
                contentStyle={{
                  background: 'var(--bg-card-solid)',
                  color: 'var(--color-text-primary)',
                  border: '1px solid var(--border-medium)',
                  borderRadius: 'var(--radius-md)',
                }}
              />
              <Bar dataKey="count" fill="var(--vintage-lavender)" radius={[8, 8, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </Surface>
  );
}
