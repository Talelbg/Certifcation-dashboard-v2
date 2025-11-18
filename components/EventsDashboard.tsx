
import React, { useState, useEffect } from 'react';
import { Event, CommunityWithMetadata } from '../types';
import { CalendarIcon, PlusIcon, TrashIcon, PencilIcon, GlobeIcon, UsersIcon } from './icons';

interface EventsDashboardProps {
    events: Event[];
    communities: CommunityWithMetadata[];
    onSave: (event: Omit<Event, 'id'>, id?: string) => void;
    onDelete: (id: string) => void;
}

const EventForm = ({
    onSave,
    editingEvent,
    clearEditing,
    communities
}: {
    onSave: (event: Omit<Event, 'id'>, id?: string) => void;
    editingEvent: Event | null;
    clearEditing: () => void;
    communities: CommunityWithMetadata[];
}) => {
    const [name, setName] = useState('');
    const [date, setDate] = useState('');
    const [description, setDescription] = useState('');
    const [type, setType] = useState<'upcoming' | 'past'>('upcoming');
    const [category, setCategory] = useState('Webinar');
    const [communityCode, setCommunityCode] = useState('All');
    const [link, setLink] = useState('');

    useEffect(() => {
        if (editingEvent) {
            setName(editingEvent.name);
            setDate(editingEvent.date);
            setDescription(editingEvent.description);
            setType(editingEvent.type);
            setCategory(editingEvent.category || 'Webinar');
            setCommunityCode(editingEvent.communityCode || 'All');
            setLink(editingEvent.link || '');
        } else {
            setName('');
            setDate('');
            setDescription('');
            setType('upcoming');
            setCategory('Webinar');
            setCommunityCode('All');
            setLink('');
        }
    }, [editingEvent]);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!name || !date) {
            alert('Event name and date are required.');
            return;
        }
        onSave({ name, date, description, type, category, communityCode, link }, editingEvent?.id);
        clearEditing();
    };

    return (
        <form onSubmit={handleSubmit} className="bg-brand-surface p-4 rounded-lg shadow-lg space-y-4 mb-6">
             <h3 className="font-bold text-lg text-brand-text">{editingEvent ? 'Edit Event' : 'Add New Event'}</h3>
             <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                 <div>
                    <label className="block text-xs text-brand-text-secondary mb-1">Event Name</label>
                    <input type="text" placeholder="e.g., Spring Hackathon" value={name} onChange={e => setName(e.target.value)} className="w-full bg-brand-border text-brand-text rounded px-3 py-2" required />
                 </div>
                 <div>
                    <label className="block text-xs text-brand-text-secondary mb-1">Date</label>
                    <input type="date" value={date} onChange={e => setDate(e.target.value)} className="w-full bg-brand-border text-brand-text rounded px-3 py-2" required />
                 </div>
             </div>
             <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                 <div>
                    <label className="block text-xs text-brand-text-secondary mb-1">Target Community</label>
                    <select value={communityCode} onChange={e => setCommunityCode(e.target.value)} className="w-full bg-brand-border text-brand-text rounded px-3 py-2">
                        <option value="All">All Communities</option>
                        {communities.map(c => <option key={c.code} value={c.code}>{c.code}</option>)}
                    </select>
                 </div>
                 <div>
                    <label className="block text-xs text-brand-text-secondary mb-1">Event Category</label>
                    <input type="text" placeholder="e.g., Webinar, Workshop" value={category} onChange={e => setCategory(e.target.value)} className="w-full bg-brand-border text-brand-text rounded px-3 py-2" />
                 </div>
                 <div>
                    <label className="block text-xs text-brand-text-secondary mb-1">Event Link</label>
                    <input type="url" placeholder="https://..." value={link} onChange={e => setLink(e.target.value)} className="w-full bg-brand-border text-brand-text rounded px-3 py-2" />
                 </div>
             </div>
             <div>
                 <label className="block text-xs text-brand-text-secondary mb-1">Description</label>
                 <textarea placeholder="Description" value={description} onChange={e => setDescription(e.target.value)} className="w-full bg-brand-border text-brand-text rounded px-3 py-2" rows={3}></textarea>
             </div>
             <div className="flex items-center space-x-4">
                <label className="text-brand-text-secondary text-sm">Status:</label>
                <div className="flex items-center">
                    <input type="radio" id="upcoming" name="type" value="upcoming" checked={type === 'upcoming'} onChange={() => setType('upcoming')} className="mr-2"/>
                    <label htmlFor="upcoming" className="text-sm text-brand-text">Upcoming</label>
                </div>
                 <div className="flex items-center">
                    <input type="radio" id="past" name="type" value="past" checked={type === 'past'} onChange={() => setType('past')} className="mr-2"/>
                    <label htmlFor="past" className="text-sm text-brand-text">Past</label>
                </div>
             </div>
             <div className="flex justify-end space-x-2">
                 {editingEvent && <button type="button" onClick={clearEditing} className="bg-gray-500 hover:bg-gray-600 text-white font-bold py-2 px-4 rounded-lg">Cancel</button>}
                 <button type="submit" className="bg-brand-primary hover:bg-brand-primary-hover text-white font-bold py-2 px-4 rounded-lg flex items-center">
                    <PlusIcon className="mr-2" />
                    {editingEvent ? 'Save Changes' : 'Add Event'}
                </button>
             </div>
        </form>
    )
}

interface EventCardProps {
    event: Event;
    onEdit: (event: Event) => void;
    onDelete: (id: string) => void;
}

const EventCard: React.FC<EventCardProps> = ({ event, onEdit, onDelete }) => {
    return (
        <div className="bg-brand-bg p-4 rounded-lg border border-brand-border hover:border-brand-primary transition-colors">
            <div className="flex justify-between items-start">
                <div>
                    <div className="flex items-center space-x-2 mb-1">
                        <span className="bg-brand-primary/20 text-brand-primary text-xs px-2 py-0.5 rounded">{event.category}</span>
                        {event.communityCode !== 'All' && <span className="bg-brand-secondary/20 text-brand-secondary text-xs px-2 py-0.5 rounded">{event.communityCode}</span>}
                    </div>
                    <h4 className="font-bold text-brand-text text-lg">{event.name}</h4>
                    <div className="text-sm text-brand-text-secondary flex items-center mt-1 space-x-4">
                        <span className="flex items-center"><CalendarIcon className="mr-1 h-4 w-4"/> {new Date(event.date).toLocaleDateString()}</span>
                        {event.link && (
                            <a href={event.link} target="_blank" rel="noreferrer" className="flex items-center text-blue-400 hover:underline">
                                <GlobeIcon className="mr-1 h-4 w-4"/> Link
                            </a>
                        )}
                    </div>
                </div>
                <div className="flex space-x-2">
                     <button onClick={() => onEdit(event)} className="text-brand-text-secondary hover:text-brand-primary"><PencilIcon /></button>
                     <button onClick={() => onDelete(event.id)} className="text-brand-text-secondary hover:text-red-500"><TrashIcon /></button>
                </div>
            </div>
            <p className="mt-3 text-sm text-brand-text-secondary">{event.description}</p>
        </div>
    );
};


export const EventsDashboard = ({ events, communities, onSave, onDelete }: EventsDashboardProps) => {
    const [editingEvent, setEditingEvent] = useState<Event | null>(null);

    const upcomingEvents = events.filter(e => e.type === 'upcoming').sort((a,b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    const pastEvents = events.filter(e => e.type === 'past').sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    return (
        <div>
            <EventForm onSave={onSave} editingEvent={editingEvent} clearEditing={() => setEditingEvent(null)} communities={communities} />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                    <h3 className="font-bold text-xl mb-4 text-brand-text flex items-center"><CalendarIcon className="mr-2"/> Upcoming Events</h3>
                    <div className="space-y-4">
                        {upcomingEvents.length > 0 ? (
                            upcomingEvents.map(event => <EventCard key={event.id} event={event} onEdit={setEditingEvent} onDelete={onDelete} />)
                        ) : (
                            <p className="text-brand-text-secondary italic">No upcoming events scheduled.</p>
                        )}
                    </div>
                </div>
                 <div>
                    <h3 className="font-bold text-xl mb-4 text-brand-text flex items-center"><UsersIcon className="mr-2"/> Past Events</h3>
                    <div className="space-y-4">
                        {pastEvents.length > 0 ? (
                            pastEvents.map(event => <EventCard key={event.id} event={event} onEdit={setEditingEvent} onDelete={onDelete} />)
                        ) : (
                            <p className="text-brand-text-secondary italic">No past events recorded.</p>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};
