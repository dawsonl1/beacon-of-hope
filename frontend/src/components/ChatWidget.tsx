import { useState } from 'react';
import { MessageCircle, X, Heart, Users, BookOpen, ArrowRight, HandHeart, Megaphone } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import styles from './ChatWidget.module.css';

/* ── Decision tree ────────────────────────────────────── */

interface ChatNode {
  message: string;
  options?: { label: string; icon: React.ReactNode; next?: string; href?: string }[];
}

const TREE: Record<string, ChatNode> = {
  root: {
    message:
      "Hi there! Thanks for visiting Beacon of Hope. I'm here to help you find the best way to get involved. What are you interested in?",
    options: [
      { label: 'Learn about our mission', icon: <BookOpen size={15} />, next: 'mission' },
      { label: 'I want to donate', icon: <Heart size={15} />, next: 'donate' },
      { label: 'I want to volunteer', icon: <Users size={15} />, next: 'volunteer' },
      { label: 'Something else', icon: <ArrowRight size={15} />, next: 'other' },
    ],
  },
  mission: {
    message:
      "We operate safe homes in Guam for girls who are survivors of sexual abuse and trafficking. We provide shelter, counseling, education, and a path to reintegration. Want to learn more or get involved?",
    options: [
      { label: 'See our impact', icon: <ArrowRight size={15} />, href: '/impact' },
      { label: 'I want to donate', icon: <Heart size={15} />, next: 'donate' },
      { label: 'I want to volunteer', icon: <Users size={15} />, next: 'volunteer' },
    ],
  },
  donate: {
    message:
      "That's amazing! Your donation directly funds shelter, education, counseling, and reintegration services. You can make a one-time gift or set up a recurring donation.",
    options: [
      { label: 'Donate now', icon: <Heart size={15} />, href: '/donate' },
      { label: 'See where donations go', icon: <ArrowRight size={15} />, href: '/impact' },
      { label: 'Go back', icon: <ArrowRight size={15} />, next: 'root' },
    ],
  },
  volunteer: {
    message:
      "We'd love your help! There are several ways to contribute your time and skills to our mission.",
    options: [
      { label: 'Volunteer on the ground', icon: <HandHeart size={15} />, next: 'volunteer_detail' },
      { label: 'Advocate & spread the word', icon: <Megaphone size={15} />, next: 'advocate' },
      { label: 'Partner with us (church, company)', icon: <Users size={15} />, next: 'partner' },
      { label: 'Go back', icon: <ArrowRight size={15} />, next: 'root' },
    ],
  },
  volunteer_detail: {
    message:
      "We welcome volunteers who can help with tutoring, mentoring, administrative support, and event coordination. Reach out to us and we'll find the right fit for your skills!",
    options: [
      { label: 'Contact us', icon: <ArrowRight size={15} />, href: '/donate' },
      { label: 'I want to donate instead', icon: <Heart size={15} />, next: 'donate' },
      { label: 'Go back', icon: <ArrowRight size={15} />, next: 'volunteer' },
    ],
  },
  advocate: {
    message:
      "Spreading awareness is one of the most powerful ways to help. Follow us on social media, share our stories, and sign up for our newsletter to stay informed.",
    options: [
      { label: 'Join our newsletter', icon: <Megaphone size={15} />, href: '/newsletter' },
      { label: 'I want to donate too', icon: <Heart size={15} />, next: 'donate' },
      { label: 'Go back', icon: <ArrowRight size={15} />, next: 'volunteer' },
    ],
  },
  partner: {
    message:
      "We partner with churches, businesses, and community groups to expand our reach. Whether it's fundraising, in-kind donations, or awareness campaigns, we'd love to work together.",
    options: [
      { label: 'Make a donation', icon: <Heart size={15} />, href: '/donate' },
      { label: 'Go back', icon: <ArrowRight size={15} />, next: 'volunteer' },
    ],
  },
  other: {
    message:
      "No problem! Here are some other things you might be looking for:",
    options: [
      { label: 'Read our privacy policy', icon: <ArrowRight size={15} />, href: '/privacy' },
      { label: 'Join our newsletter', icon: <Megaphone size={15} />, href: '/newsletter' },
      { label: 'Log in to donor portal', icon: <ArrowRight size={15} />, href: '/login' },
      { label: 'Go back', icon: <ArrowRight size={15} />, next: 'root' },
    ],
  },
};

/* ── Component ────────────────────────────────────────── */

interface ChatMessage {
  from: 'bot' | 'user';
  text: string;
}

export default function ChatWidget() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([
    { from: 'bot', text: TREE.root.message },
  ]);
  const [currentNode, setCurrentNode] = useState('root');
  const navigate = useNavigate();

  const handleOption = (opt: { label: string; icon: React.ReactNode; next?: string; href?: string }) => {
    // Add user's choice as a message
    setMessages(prev => [...prev, { from: 'user', text: opt.label }]);

    if (opt.href) {
      // Navigate after a brief delay so the user sees their selection
      setTimeout(() => {
        setOpen(false);
        navigate(opt.href!);
      }, 400);
      return;
    }

    if (opt.next) {
      const node = TREE[opt.next];
      setCurrentNode(opt.next);
      // Small delay for natural feel
      setTimeout(() => {
        setMessages(prev => [...prev, { from: 'bot', text: node.message }]);
      }, 300);
    }
  };

  const handleReset = () => {
    setMessages([{ from: 'bot', text: TREE.root.message }]);
    setCurrentNode('root');
  };

  const node = TREE[currentNode];

  return (
    <>
      {/* Floating button */}
      {!open && (
        <button
          className={styles.fab}
          onClick={() => setOpen(true)}
          aria-label="Open chat"
          title="Open chat"
        >
          <MessageCircle size={24} />
        </button>
      )}

      {/* Chat panel */}
      {open && (
        <div className={styles.panel}>
          <div className={styles.header}>
            <div className={styles.headerInfo}>
              <span className={styles.headerDot} />
              <span className={styles.headerTitle}>Beacon of Hope</span>
            </div>
            <button className={styles.closeBtn} onClick={() => setOpen(false)} aria-label="Close chat" title="Close chat">
              <X size={18} />
            </button>
          </div>

          <div className={styles.messages}>
            {messages.map((msg, i) => (
              <div
                key={i}
                className={`${styles.bubble} ${msg.from === 'user' ? styles.bubbleUser : styles.bubbleBot}`}
              >
                {msg.text}
              </div>
            ))}

            {/* Show options for current node */}
            {node?.options && (
              <div className={styles.options}>
                {node.options.map((opt) => (
                  <button
                    key={opt.label}
                    className={styles.optionBtn}
                    onClick={() => handleOption(opt)}
                  >
                    {opt.icon}
                    {opt.label}
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className={styles.footer}>
            <button className={styles.resetBtn} onClick={handleReset}>
              Start over
            </button>
          </div>
        </div>
      )}
    </>
  );
}
