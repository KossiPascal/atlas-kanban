import { Injectable } from '@angular/core';
import { Task, AppUser, Tag, CheckItem, Priority } from '@kba-models/task.model';


@Injectable({ providedIn: 'root' })
export class TaskProviderService {

    COLORS: { bg: string; color: string }[] = [
        { bg: "#fce7f3", color: "#be185d" },
        { bg: "#e0f2fe", color: "#0369a1" },
        { bg: "#fef3c7", color: "#b45309" },
        { bg: "#dcfce7", color: "#15803d" },
        { bg: "#ede9fe", color: "#6d28d9" },
        { bg: '#fff6e8', color: '#b86f00' },
        { bg: '#f3e8ff', color: '#7b4dd9' },
        { bg: '#ffeef0', color: '#b23b4a' },
        { bg: '#dbeafe', color: '#1d4ed8' },
        { bg: '#fee2e2', color: '#b91c1c' },
        { bg: '#e6ffed', color: '#059669' },
    ];

    getColor() {
        return this.COLORS[Math.floor(Math.random() * this.COLORS.length)];
    }



    withOpacity(hex: string, alpha: number): string {
        // On enlève le '#' si présent
        hex = hex.replace('#', '');

        // Si format court (#f00), on l’étend (#ff0000)
        if (hex.length === 3) {
            hex = hex.split('').map(c => c + c).join('');
        }

        // Clamp alpha entre 0 et 1
        alpha = Math.max(0, Math.min(1, alpha));

        // Conversion alpha en 2 caractères hex
        const alphaHex = Math.round(alpha * 255).toString(16).padStart(2, '0');

        return `#${hex}${alphaHex}`;
    }


    INITIAL_TASKS: Task[] = [
        {
            id: 't1',
            title: 'Wireframing',
            description: 'Create low-fidelity designs that outline the basic structure and layout of the product or service...',
            tag: { id: 'id1', name: 'UX stages', bg: '#fff6e8', color: '#b86f00' },
            checklist: [
                { id: 'c1', name: 'toto', done: { ok: true, by: '7', at: Date.now() }, created: { by: 'c0', at: Date.now() } },
                { id: 'c2', name: 'momo', done: { ok: true, by: '7', at: Date.now() }, created: { by: 'c0', at: Date.now() } }
            ],
            views: {
                '7': { at: 1675265265 },
                '2': { at: 1675551515 }
            },
            attachments: {
                '7': {
                    at: 1675265265, files: [{
                        url: 'https://toto.tg',
                        id: '',
                        size: 0
                    }]
                }
            },
            columnId: 'todo',
            owner: '1',
            createdAt: Date.now(),
            updatedBy: '1',
            updatedAt: Date.now(),
            priority: undefined,
            comments: []
        },
        {
            id: 't2',
            title: 'First design concept',
            description: 'Create a concept based on the research and insights gathered during the discovery phase of the project...',
            tag: { id: 'id2', name: 'Design', bg: '#f3e8ff', color: '#7b4dd9' },
            checklist: [
                {
                    id: 'c1', name: 'Sketch',
                    done: {
                        ok: false,
                        by: '',
                        at: 0
                    },
                    created: {
                        by: '',
                        at: 0
                    }
                },
                {
                    id: 'c2', name: 'Review',
                    done: {
                        ok: false,
                        by: '',
                        at: 0
                    },
                    created: {
                        by: '',
                        at: 0
                    }
                },
                {
                    id: 'c3', name: 'Feedback',
                    done: {
                        ok: false,
                        by: '',
                        at: 0
                    },
                    created: {
                        by: '',
                        at: 0
                    }
                },
                {
                    id: 'c4', name: 'Finalize',
                    done: {
                        ok: false,
                        by: '',
                        at: 0
                    },
                    created: {
                        by: '',
                        at: 0
                    }
                }
            ],
            views: { '1': { at: Date.now() } },
            comments: [],
            attachments: {},
            columnId: 'todo',
            owner: '2',
            createdAt: Date.now(),
            updatedBy: '2',
            updatedAt: Date.now(),
            priority: undefined
        },
        {
            id: 't3',
            title: 'Design library',
            description: 'Create a collection of reusable design elements...',
            tag: { id: 'id3', name: 'Design', bg: '#f3e8ff', color: '#7b4dd9' },
            checklist: [],
            views: { '1': { at: Date.now() } },
            comments: [],
            attachments: {
                '1': {
                    at: Date.now(), files: [{
                        url: 'https://cdn.design-system.com/ui-kit',
                        id: '',
                        size: 0
                    }]
                }
            },
            columnId: 'todo',
            owner: '2',
            createdAt: Date.now(),
            updatedBy: '3',
            updatedAt: Date.now(),
            priority: undefined
        },
        {
            id: 't4',
            title: 'Customer Journey Mapping',
            description: 'Identify the key touchpoints and pain points in the customer journey...',
            tag: { id: 'id4', name: 'UX stages', bg: '#fff6e8', color: '#b86f00' },
            checklist: [
                {
                    id: 'c1', name: 'Interviews', done: { ok: true, by: '2', at: Date.now() },
                    created: {
                        by: '',
                        at: 0
                    }
                },
                {
                    id: 'c2', name: 'Touchpoints', done: { ok: true, by: '3', at: Date.now() },
                    created: {
                        by: '',
                        at: 0
                    }
                },
                {
                    id: 'c3', name: 'Pain points', done: { ok: true, by: '3', at: Date.now() },
                    created: {
                        by: '',
                        at: 0
                    }
                },
                {
                    id: 'c4', name: 'Opportunities',
                    done: {
                        ok: false,
                        by: '',
                        at: 0
                    },
                    created: {
                        by: '',
                        at: 0
                    }
                },
                {
                    id: 'c5', name: 'Journey map',
                    done: {
                        ok: false,
                        by: '',
                        at: 0
                    },
                    created: {
                        by: '',
                        at: 0
                    }
                },
                {
                    id: 'c6', name: 'Validation',
                    done: {
                        ok: false,
                        by: '',
                        at: 0
                    },
                    created: {
                        by: '',
                        at: 0
                    }
                },
                {
                    id: 'c7', name: 'Iteration',
                    done: {
                        ok: false,
                        by: '',
                        at: 0
                    },
                    created: {
                        by: '',
                        at: 0
                    }
                },
                {
                    id: 'c8', name: 'Final map',
                    done: {
                        ok: false,
                        by: '',
                        at: 0
                    },
                    created: {
                        by: '',
                        at: 0
                    }
                },
                {
                    id: 'c9', name: 'Presentation',
                    done: {
                        ok: false,
                        by: '',
                        at: 0
                    },
                    created: {
                        by: '',
                        at: 0
                    }
                },
                {
                    id: 'c10', name: 'Approval',
                    done: {
                        ok: false,
                        by: '',
                        at: 0
                    },
                    created: {
                        by: '',
                        at: 0
                    }
                }
            ],
            views: {
                '1': { at: Date.now() },
                '2': { at: Date.now() },
                '3': { at: Date.now() },
                '4': { at: Date.now() },
                '5': { at: Date.now() },
                '6': { at: Date.now() }
            },
            comments: [],
            attachments: {},
            columnId: 'inprogress',
            owner: '3',
            createdAt: Date.now(),
            updatedBy: '4',
            updatedAt: Date.now(),
            priority: undefined
        },
        {
            id: 't5',
            title: 'Persona development',
            description: 'Create user personas based on the research data to represent different user groups...',
            tag: { id: 'id5', name: 'UX stages', bg: '#fff6e8', color: '#b86f00' },
            checklist: [
                {
                    id: 'c1', name: 'Identify user groups', done: { ok: true, by: '1', at: Date.now() },
                    created: {
                        by: '',
                        at: 0
                    }
                },
                {
                    id: 'c2', name: 'Draft personas',
                    done: {
                        ok: false,
                        by: '',
                        at: 0
                    },
                    created: {
                        by: '',
                        at: 0
                    }
                }
            ],
            views: {
                '1': { at: Date.now() },
                '2': { at: Date.now() }
            },
            comments: [],
            attachments: {
                '1': {
                    at: Date.now(), files: [{
                        url: 'https://persona-template.pdf',
                        id: '',
                        size: 0
                    }]
                }
            },
            columnId: 'inprogress',
            owner: '2',
            createdAt: Date.now(),
            updatedBy: '2',
            updatedAt: Date.now(),
            priority: undefined
        },
        {
            id: 't6',
            title: 'Competitor research',
            description: 'Research competitors and identify weakness and strengths each of them...',
            tag: { id: 'id6', name: 'UX stages', bg: '#fff6e8', color: '#b86f00' },
            checklist: [
                {
                    id: 'c1', name: 'Collect competitors',
                    done: {
                        ok: false,
                        by: '',
                        at: 0
                    },
                    created: {
                        by: '',
                        at: 0
                    }
                },
                {
                    id: 'c2', name: 'Analyze strengths',
                    done: {
                        ok: false,
                        by: '',
                        at: 0
                    },
                    created: {
                        by: '',
                        at: 0
                    }
                },
                {
                    id: 'c3', name: 'Analyze weaknesses',
                    done: {
                        ok: false,
                        by: '',
                        at: 0
                    },
                    created: {
                        by: '',
                        at: 0
                    }
                },
                {
                    id: 'c4', name: 'Compare features',
                    done: {
                        ok: false,
                        by: '',
                        at: 0
                    },
                    created: {
                        by: '',
                        at: 0
                    }
                },
                {
                    id: 'c5', name: 'SWOT analysis',
                    done: {
                        ok: false,
                        by: '',
                        at: 0
                    },
                    created: {
                        by: '',
                        at: 0
                    }
                },
                {
                    id: 'c6', name: 'Market position',
                    done: {
                        ok: false,
                        by: '',
                        at: 0
                    },
                    created: {
                        by: '',
                        at: 0
                    }
                },
                {
                    id: 'c7', name: 'Report',
                    done: {
                        ok: false,
                        by: '',
                        at: 0
                    },
                    created: {
                        by: '',
                        at: 0
                    }
                }
            ],
            views: {
                '1': { at: Date.now() },
                '2': { at: Date.now() },
                '3': { at: Date.now() },
                '4': { at: Date.now() }
            },
            comments: [],
            attachments: {
                '1': {
                    at: Date.now(), files: [{
                        url: 'https://competitor-analysis.pdf',
                        id: '',
                        size: 0
                    }]
                }
            },
            columnId: 'needreview',
            owner: '5',
            createdAt: Date.now(),
            updatedBy: '5',
            updatedAt: Date.now(),
            priority: undefined
        },
        {
            id: 't7',
            title: 'Branding, visual identity',
            description: 'Create a brand identity system that includes a logo, typography, color palette, and brand guidelines...',
            tag: { id: 'id7', name: 'Branding', bg: '#ffeef0', color: '#b23b4a' },
            checklist: [
                {
                    id: 'c1', name: 'Logo',
                    done: {
                        ok: false,
                        by: '',
                        at: 0
                    },
                    created: {
                        by: '',
                        at: 0
                    }
                },
                {
                    id: 'c2', name: 'Typography',
                    done: {
                        ok: false,
                        by: '',
                        at: 0
                    },
                    created: {
                        by: '',
                        at: 0
                    }
                },
                {
                    id: 'c3', name: 'Guidelines',
                    done: {
                        ok: false,
                        by: '',
                        at: 0
                    },
                    created: {
                        by: '',
                        at: 0
                    }
                }
            ],
            views: {
                '1': { at: Date.now() },
                '2': { at: Date.now() },
                '3': { at: Date.now() }
            },
            comments: [],
            attachments: {},
            columnId: 'done',
            owner: '3',
            createdAt: Date.now(),
            updatedBy: '3',
            updatedAt: Date.now(),
            priority: undefined
        },
        {
            id: 't8',
            title: 'Marketing materials',
            description: 'Create branded materials such as business cards, flyers, brochures, and social media graphics...',
            tag: { id: 'id8', name: 'Branding', bg: '#ffeef0', color: '#b23b4a' },
            checklist: [
                {
                    id: 'c1', name: 'Business cards',
                    done: {
                        ok: false,
                        by: '',
                        at: 0
                    },
                    created: {
                        by: '',
                        at: 0
                    }
                },
                {
                    id: 'c2', name: 'Flyers',
                    done: {
                        ok: false,
                        by: '',
                        at: 0
                    },
                    created: {
                        by: '',
                        at: 0
                    }
                },
                {
                    id: 'c3', name: 'Brochures',
                    done: {
                        ok: false,
                        by: '',
                        at: 0
                    },
                    created: {
                        by: '',
                        at: 0
                    }
                },
                {
                    id: 'c4', name: 'Social media graphics',
                    done: {
                        ok: false,
                        by: '',
                        at: 0
                    },
                    created: {
                        by: '',
                        at: 0
                    }
                },
                {
                    id: 'c5', name: 'Print templates',
                    done: {
                        ok: false,
                        by: '',
                        at: 0
                    },
                    created: {
                        by: '',
                        at: 0
                    }
                }
            ],
            views: {
                '1': { at: Date.now() },
                '2': { at: Date.now() }
            },
            comments: [],
            attachments: {
                '1': {
                    at: Date.now(), files: [{
                        url: 'https://marketing-kit.zip',
                        id: '',
                        size: 0
                    }]
                }
            },
            columnId: 'done',
            owner: '4',
            createdAt: Date.now(),
            updatedBy: '4',
            updatedAt: Date.now(),
            priority: undefined
        }
    ];





    // ############################################
    // demo data
    // usersList: AppUser[] = [
    //     { id: 'u1', name: 'Alice Laurent', email: 'alice@ex.com', color: '#ef4444' },
    //     { id: 'u2', name: 'Bob Martin', email: 'bob@ex.com', color: '#f59e0b' },
    //     { id: 'u3', name: 'Chloé Dupont', email: 'chloe@ex.com', color: '#10b981' },
    //     { id: 'u4', name: 'David K', email: 'david@ex.com', color: '#6366f1' },
    //     { id: 'l1', name: 'Alice Laurent', email: 'alice@ex.com', color: '#ef4444' },
    //     { id: 'l2', name: 'Bob Martin', email: 'bob@ex.com', color: '#f59e0b' },
    //     { id: 'l3', name: 'Chloé Dupont', email: 'chloe@ex.com', color: '#10b981' },
    //     { id: 'l4', name: 'David K', email: 'david@ex.com', color: '#6366f1' },
    //     { id: 'g1', name: 'Alice Laurent', email: 'alice@ex.com', color: '#ef4444' },
    //     { id: 'g2', name: 'Bob Martin', email: 'bob@ex.com', color: '#f59e0b' },
    //     { id: 'g3', name: 'Chloé Dupont', email: 'chloe@ex.com', color: '#10b981' },
    //     { id: 'g4', name: 'David K', email: 'david@ex.com', color: '#6366f1' },
    //     { id: 'y1', name: 'Alice Laurent', email: 'alice@ex.com', color: '#ef4444' },
    //     { id: 'y2', name: 'Bob Martin', email: 'bob@ex.com', color: '#f59e0b' },
    //     { id: 'y3', name: 'Chloé Dupont', email: 'chloe@ex.com', color: '#10b981' },
    //     { id: 'y4', name: 'David K', email: 'david@ex.com', color: '#6366f1' },
    //     { id: 't1', name: 'Alice Laurent', email: 'alice@ex.com', color: '#ef4444' },
    //     { id: 't2', name: 'Bob Martin', email: 'bob@ex.com', color: '#f59e0b' },
    //     { id: 't3', name: 'Chloé Dupont', email: 'chloe@ex.com', color: '#10b981' },
    //     { id: 't4', name: 'David K', email: 'david@ex.com', color: '#6366f1' },
    // ];


    defaultPriority: Priority = { id: 'low', name: 'Low', label: 'Low', big: { color: '#065f46', bg: '#d1fae5' }, small: { color: '#047857', bg: '#a7f3d0' } };

    prioritiesList: Priority[] = [
        this.defaultPriority,
        { id: 'med', name: 'Medium', label: 'Medium', big: { color: '#78350f', bg: '#ffedd5' }, small: { color: '#b45309', bg: '#fed7aa' } },
        { id: 'high', name: 'High', label: 'High', big: { color: '#9b1232', bg: '#fee2e2' }, small: { color: '#b91c1c', bg: '#fca5a5' } },
    ];



    defaultTag: Tag = { id: 'tag1', name: 'New', bg: this.withOpacity('#059669', 0.15), color: '#065f46' };

    // Define all tag styles
    tagsList: Tag[] = [
        this.defaultTag,
        { id: 'tag2', name: 'UX stages', bg: this.withOpacity('#b86f00', 0.15), color: '#92400e' },   // amber
        { id: 'tag3', name: 'Design', bg: this.withOpacity('#7b4dd9', 0.15), color: '#5b21b6' },      // purple
        { id: 'tag4', name: 'Branding', bg: this.withOpacity('#b23b4a', 0.15), color: '#991b1b' },    // red
        // { id: 'tag5', name: 'Feature', bg: this.withOpacity('#1d4ed8', 0.15), color: '#1e40af' },     // blue
        // { id: 'tag6', name: 'Bug', bg: this.withOpacity('#fef3c7', 0.25), color: '#b45309' },         // yellow/brown
        // { id: 'tag7', name: 'Urgent', bg: this.withOpacity('#fee2e2', 0.25), color: '#b91c1c' },      // red
        // { id: 'tag8', name: 'Review', bg: this.withOpacity('#e0f2fe', 0.25), color: '#0369a1' },      // light blue
        // { id: 'tag9', name: 'Research', bg: this.withOpacity('#fdb7c0', 0.25), color: '#be123c' },    // pink/red
    ];



    // Returns inline style for a tag 
    getTagStyle(tagName: string) {
        const t = this.tagsList.find(x => x.name.toLowerCase() === tagName.toLowerCase());
        if (t) return { 'backColor': t.bg, 'textColor': t.color };
        return { 'backColor': '#f1f5f9', textColor: '#334155' }; // default
    }
}
