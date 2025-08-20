// Intersection Observer for fade-in animations
const observerOptions = {
    threshold: 0.1,
    rootMargin: '0px 0px -50px 0px'
};

const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
        if (entry.isIntersecting) {
            entry.target.classList.add('visible');
        }
    });
}, observerOptions);

// Observe all fade-in elements
document.querySelectorAll('.fade-in').forEach(el => {
    observer.observe(el);
});

// Form submission with better UX
document.querySelector('.contact-form form').addEventListener('submit', function(e) {
    e.preventDefault();
    
    const button = this.querySelector('.submit-button');
    const originalText = button.textContent;
    
    // Loading state
    button.textContent = 'Sending...';
    button.style.background = '#666';
    
    // Simulate sending (replace with actual form handling)
    setTimeout(() => {
        button.textContent = 'Message Sent ✓';
        button.style.background = '#28a745';
        
        setTimeout(() => {
            button.textContent = originalText;
            button.style.background = '#009DE0';
            this.reset();
        }, 2000);
    }, 1500);
});

// Smooth parallax effect for hero background
window.addEventListener('scroll', () => {
    const scrolled = window.pageYOffset;
    const hero = document.querySelector('.hero::before');
    if (hero) {
        document.documentElement.style.setProperty('--scroll', scrolled * 0.5 + 'px');
    }
});