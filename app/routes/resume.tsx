import {Link, useNavigate, useParams} from "react-router";
import {useEffect, useState} from "react";
import {usePuterStore} from "~/lib/puter";
import Summary from "~/components/Summary";
import ATS from "~/components/ATS";
import Details from "~/components/Details";

export const meta = () => ([
    { title: 'Resumind | Review ' },
    { name: 'description', content: 'Detailed overview of your resume' },
])

const Resume = () => {
    const { auth, isLoading, fs, kv } = usePuterStore();
    const { id } = useParams();
    const [imageUrl, setImageUrl] = useState('');
    const [resumeUrl, setResumeUrl] = useState('');
    const [feedback, setFeedback] = useState<Feedback | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const navigate = useNavigate();

    useEffect(() => {
        if(!isLoading && !auth.isAuthenticated) navigate(`/auth?next=/resume/${id}`);
    }, [isLoading])

    useEffect(() => {
        const loadResume = async () => {
            try {
                setLoading(true);
                setError(null);
                
                console.log('Loading resume data for ID:', id);
                const resume = await kv.get(`resume:${id}`);
                console.log('Raw resume data:', resume);

                if(!resume) {
                    console.error('No resume data found for ID:', id);
                    setError('Resume not found');
                    setLoading(false);
                    return;
                }

                let data;
                try {
                    data = JSON.parse(resume);
                    console.log('Parsed resume data:', data);
                } catch (parseError) {
                    console.error('Failed to parse resume data:', parseError);
                    setError('Invalid resume data');
                    setLoading(false);
                    return;
                }

                if (!data.resumePath || !data.imagePath) {
                    console.error('Missing file paths in resume data:', data);
                    setError('Resume files missing');
                    setLoading(false);
                    return;
                }

                console.log('Loading resume file from:', data.resumePath);
                const resumeBlob = await fs.read(data.resumePath);
                if(!resumeBlob) {
                    console.error('Failed to read resume file');
                    setError('Failed to load resume file');
                    setLoading(false);
                    return;
                }

                const pdfBlob = new Blob([resumeBlob], { type: 'application/pdf' });
                const resumeUrl = URL.createObjectURL(pdfBlob);
                setResumeUrl(resumeUrl);
                console.log('Resume URL created:', resumeUrl);

                console.log('Loading image file from:', data.imagePath);
                const imageBlob = await fs.read(data.imagePath);
                if(!imageBlob) {
                    console.error('Failed to read image file');
                    setError('Failed to load resume image');
                    setLoading(false);
                    return;
                }
                const imageUrl = URL.createObjectURL(imageBlob);
                setImageUrl(imageUrl);
                console.log('Image URL created:', imageUrl);

                if (data.feedback) {
                    setFeedback(data.feedback);
                    console.log('Feedback data loaded:', data.feedback);
                } else {
                    console.warn('No feedback data found');
                }
                
                setLoading(false);
            } catch (error) {
                console.error('Error loading resume:', error);
                setError(`Failed to load resume: ${error instanceof Error ? error.message : 'Unknown error'}`);
                setLoading(false);
            }
        }

        if (id) {
            loadResume();
        }
    }, [id]);

    return (
        <main className="!pt-0">
            <nav className="resume-nav">
                <Link to="/" className="back-button">
                    <img src="/icons/back.svg" alt="logo" className="w-2.5 h-2.5" />
                    <span className="text-gray-800 text-sm font-semibold">Back to Homepage</span>
                </Link>
            </nav>
            <div className="flex flex-row w-full max-lg:flex-col-reverse">
                <section className="feedback-section bg-[url('/images/bg-small.svg') bg-cover h-[100vh] sticky top-0 items-center justify-center">
                    {imageUrl && resumeUrl && (
                        <div className="animate-in fade-in duration-1000 gradient-border max-sm:m-0 h-[90%] max-wxl:h-fit w-fit">
                            <a href={resumeUrl} target="_blank" rel="noopener noreferrer">
                                <img
                                    src={imageUrl}
                                    className="w-full h-full object-contain rounded-2xl"
                                    title="resume"
                                />
                            </a>
                        </div>
                    )}
                </section>
                <section className="feedback-section">
                    <h2 className="text-4xl !text-black font-bold">Resume Review</h2>
                    {error ? (
                        <div className="flex flex-col items-center justify-center text-center p-8">
                            <img src="/icons/warning.svg" alt="Error" className="w-16 h-16 mb-4 opacity-50" />
                            <h3 className="text-2xl font-semibold text-red-600 mb-2">Error Loading Resume</h3>
                            <p className="text-gray-600 mb-4">{error}</p>
                            <button 
                                onClick={() => window.location.reload()} 
                                className="primary-button"
                            >
                                Try Again
                            </button>
                        </div>
                    ) : feedback ? (
                        <div className="flex flex-col gap-8 animate-in fade-in duration-1000">
                            <Summary feedback={feedback} />
                            <ATS score={feedback.ATS.score || 0} suggestions={feedback.ATS.tips || []} />
                            <Details feedback={feedback} />
                        </div>
                    ) : (
                        <div className="flex flex-col items-center justify-center text-center">
                            <img src="/images/resume-scan-2.gif" className="w-full max-w-md" />
                            <p className="text-gray-600 mt-4">{loading ? 'Loading resume data...' : 'Processing...'}</p>
                        </div>
                    )}
                </section>
            </div>
        </main>
    )
}
export default Resume
