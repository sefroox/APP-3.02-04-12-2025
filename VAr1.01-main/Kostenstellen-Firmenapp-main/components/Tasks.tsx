import React, { useState } from 'react';
import { Task } from '../types';
import { CheckSquare, Clock, User, Plus, X, Check } from 'lucide-react';

interface TasksProps {
    tasks?: Task[];
    onAddTask?: (task: Task) => void;
    onToggleTask?: (taskId: string) => void;
}

const Tasks: React.FC<TasksProps> = ({ tasks = [], onAddTask, onToggleTask }) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newTask, setNewTask] = useState<Partial<Task>>({ priority: 'Medium', assignedTo: 'Admin' });

  const handleSave = () => {
      if (!newTask.title || !onAddTask) return;
      onAddTask({
          id: `t-${Date.now()}`,
          title: newTask.title,
          assignedTo: newTask.assignedTo || 'Admin',
          dueDate: newTask.dueDate || new Date().toISOString().split('T')[0],
          priority: newTask.priority || 'Medium',
          completed: false,
          relatedEntityId: undefined
      });
      setIsModalOpen(false);
      setNewTask({ priority: 'Medium', assignedTo: 'Admin' });
  };

  const toggle = (id: string) => {
      if(onToggleTask) onToggleTask(id);
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-slate-800">Aufgaben & ToDos</h1>
        <button onClick={() => setIsModalOpen(true)} className="bg-brand-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-brand-700 shadow-sm flex items-center">
          <Plus className="w-4 h-4 mr-2" /> Aufgabe erstellen
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
         {/* Column: High Priority */}
         <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-100">
            <h3 className="font-bold text-slate-700 mb-4 flex items-center">
              <div className="w-3 h-3 rounded-full bg-red-500 mr-2"></div> Priorität Hoch
            </h3>
            <div className="space-y-3">
               {tasks.filter(t => t.priority === 'High' && !t.completed).map(task => (
                 <TaskCard key={task.id} task={task} onToggle={() => toggle(task.id)} />
               ))}
               {tasks.filter(t => t.priority === 'High' && !t.completed).length === 0 && <EmptyState />}
            </div>
         </div>

         {/* Column: Medium */}
         <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-100">
            <h3 className="font-bold text-slate-700 mb-4 flex items-center">
              <div className="w-3 h-3 rounded-full bg-orange-500 mr-2"></div> Priorität Mittel
            </h3>
            <div className="space-y-3">
               {tasks.filter(t => t.priority === 'Medium' && !t.completed).map(task => (
                 <TaskCard key={task.id} task={task} onToggle={() => toggle(task.id)} />
               ))}
               {tasks.filter(t => t.priority === 'Medium' && !t.completed).length === 0 && <EmptyState />}
            </div>
         </div>

         {/* Column: Low/Done */}
         <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-100">
            <h3 className="font-bold text-slate-700 mb-4 flex items-center">
              <div className="w-3 h-3 rounded-full bg-blue-500 mr-2"></div> Priorität Niedrig / Erledigt
            </h3>
            <div className="space-y-3">
               {tasks.filter(t => t.priority === 'Low' && !t.completed).map(task => (
                 <TaskCard key={task.id} task={task} onToggle={() => toggle(task.id)} />
               ))}
               
               {/* Completed Section */}
               {tasks.some(t => t.completed) && (
                   <>
                    <div className="border-t border-slate-100 my-2 pt-2 text-xs font-bold text-slate-400 uppercase">Erledigt</div>
                    {tasks.filter(t => t.completed).map(task => (
                        <TaskCard key={task.id} task={task} onToggle={() => toggle(task.id)} />
                    ))}
                   </>
               )}
            </div>
         </div>
      </div>

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-fade-in">
           <div className="bg-white rounded-xl shadow-2xl w-full max-w-md overflow-hidden">
              <div className="bg-slate-50 px-6 py-4 border-b border-slate-200 flex justify-between items-center">
                 <h3 className="font-bold text-slate-800">Neue Aufgabe</h3>
                 <button onClick={() => setIsModalOpen(false)}><X className="w-5 h-5 text-slate-400" /></button>
              </div>
              <div className="p-6 space-y-4">
                 <div>
                    <label className="block text-xs font-medium text-slate-500 mb-1">Titel *</label>
                    <input type="text" className="w-full rounded-lg border-slate-300" placeholder="Aufgabe beschreiben" value={newTask.title || ''} onChange={e => setNewTask({...newTask, title: e.target.value})} />
                 </div>
                 <div className="grid grid-cols-2 gap-4">
                     <div>
                        <label className="block text-xs font-medium text-slate-500 mb-1">Priorität</label>
                        <select className="w-full rounded-lg border-slate-300" value={newTask.priority} onChange={e => setNewTask({...newTask, priority: e.target.value as any})}>
                            <option value="Low">Niedrig</option>
                            <option value="Medium">Mittel</option>
                            <option value="High">Hoch</option>
                        </select>
                     </div>
                     <div>
                        <label className="block text-xs font-medium text-slate-500 mb-1">Fällig am</label>
                        <input type="date" className="w-full rounded-lg border-slate-300" value={newTask.dueDate || ''} onChange={e => setNewTask({...newTask, dueDate: e.target.value})} />
                     </div>
                 </div>
                 <div>
                    <label className="block text-xs font-medium text-slate-500 mb-1">Zugewiesen an</label>
                    <input type="text" className="w-full rounded-lg border-slate-300" value={newTask.assignedTo || ''} onChange={e => setNewTask({...newTask, assignedTo: e.target.value})} />
                 </div>
                 <button onClick={handleSave} className="w-full bg-brand-600 text-white py-2 rounded-lg font-medium hover:bg-brand-700 mt-2">Speichern</button>
              </div>
           </div>
        </div>
      )}
    </div>
  );
};

const TaskCard: React.FC<{task: Task, onToggle: () => void}> = ({ task, onToggle }) => (
  <div className={`p-3 rounded-lg border hover:shadow-md transition-all cursor-pointer group ${task.completed ? 'bg-slate-50 border-slate-100 opacity-60' : 'bg-white border-slate-200'}`}>
     <div className="flex justify-between items-start mb-2">
       <span className={`text-sm font-semibold line-clamp-2 ${task.completed ? 'text-slate-500 line-through' : 'text-slate-800'}`}>{task.title}</span>
       <button onClick={(e) => { e.stopPropagation(); onToggle(); }} className={`hover:scale-110 transition-transform ${task.completed ? 'text-green-600' : 'text-slate-300 hover:text-green-600'}`}>
         {task.completed ? <Check size={18} /> : <CheckSquare size={18} />}
       </button>
     </div>
     <div className="flex items-center justify-between text-xs text-slate-500 mt-3">
        <div className="flex items-center">
           <User size={12} className="mr-1" /> {task.assignedTo.split(' ')[0]}
        </div>
        <div className="flex items-center bg-white px-2 py-0.5 rounded border border-slate-100">
           <Clock size={12} className="mr-1" /> {task.dueDate}
        </div>
     </div>
  </div>
);

const EmptyState = () => (
  <div className="py-8 text-center text-slate-400 text-sm border-2 border-dashed border-slate-100 rounded-lg">
    Keine Aufgaben.
  </div>
);

export default Tasks;