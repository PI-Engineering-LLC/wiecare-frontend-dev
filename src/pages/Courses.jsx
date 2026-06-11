import React, { useState, useEffect, useRef } from 'react';
import { api } from '@/api/apiClient';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Search, BookOpen, Play, Clock, CheckCircle2, Star, ChevronRight } from 'lucide-react';
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import PageHeader from '@/components/shared/PageHeader';
import StatsCard from '@/components/shared/StatsCard';
import EmptyState from '@/components/shared/EmptyState';
import { toast } from 'sonner';
import { useClient } from '@/lib/ClientContext';
import { PublicImage } from '@/components/PublicImage';
import CourseVideo from '@/components/CourseVideo';
import { useAuth } from '@/lib/AuthContext';

export default function Courses() {
  const {user} = useAuth();
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [selectedCourse, setSelectedCourse] = useState(null);
  const [activeTab, setActiveTab] = useState('all');

  const queryClient = useQueryClient();
  
  const {activeClientId,setActiveClientId} = useClient()

  const { data: courses = [], isLoading: loadingCourses } = useQuery({
    queryKey: ['courses'],
    queryFn: () => api.getCourses( { status: 'published', order: 'order_index', limit: 100 }),
    enabled: !!user,
  });

  const { data: progress = [], isLoading: loadingProgress } = useQuery({
    queryKey: ['courseProgress', user?.id],
    queryFn: () => user?.id 
      ? api.getAllCourseProgress({ user_id: user.id, order: '-last_watched_at', limit: 100 })
      : [],
    enabled: !!user?.id,
  });
  const getProgressForCourse = (courseId) => {
    return progress.find(p => p.course_id === courseId);
  };
  const [localProgress, setLocalProgress] = useState(getProgressForCourse(selectedCourse?.id)?.progress_percent || 0);
  const [currentSeconds, setCurrentSeconds] = useState((getProgressForCourse(selectedCourse?.id)?.watch_time_seconds || 0));


  const updateProgressMutation = useMutation({
    mutationFn: async ({ courseId, data }) => {
      const existing = progress.find(p => p.course_id === courseId);
      console.log(existing)
      if (existing) {
        return api.updateProgress(courseId,existing.id, data);
      } else {
        return api.createCourseProgress(courseId, {
          client_id: activeClientId,
          ...data
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['courseProgress']});
    },
  });
  const updateCourseMutation  = useMutation({
      // @ts-ignore
      mutationFn: async ({ courseId, data }) => {api.updateCourse(courseId, data)},
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ['courses', selectedCourse?.id]});
        toast.success('Course updated successfully');
      },
          onError: (error) => {
      console.error('Failed to update course duration:', error);
    }
    });

    const selectedCourseRef = useRef(selectedCourse);
const secondsRef = useRef(currentSeconds);
    useEffect(() => {
      selectedCourseRef.current = selectedCourse;
      secondsRef.current = currentSeconds;
    }, [selectedCourse, currentSeconds]);
    useEffect(() => {
      return () => {
        const course = selectedCourseRef.current;
        const seconds = secondsRef.current;
        if (course) {
          const progressId = getProgressForCourse(course.id)?.id
        console.log(getProgressForCourse(course.id),progressId)
        const status = calculateStatus(seconds, course.duration_minutes)
        
          const payload = {
            watch_time_seconds: seconds,
            // duration_minutes: course.duration_minutes,
            last_watched_at: new Date().toISOString(),
            status: status,
            progress_percent: status === 'completed' ? 100 : Math.floor((seconds / (course.duration_minutes * 60)) * 100),     
          };
           
      api.updateProgress(course.id, progressId, payload).catch(err => console.error("Auto-save on unmount failed:", err));
    }
  };
}, []); 
const calculateStatus = (currentSeconds, durationMinutes) => {
  const totalSeconds = durationMinutes * 60;
  if (totalSeconds === 0) return 'in_progress';
  
  const percentage = (currentSeconds / totalSeconds) * 100;
  // If they reached 95% or more, mark it as completed
  return percentage >= 95 ? 'completed' : 'in_progress';
};
const calculatePercentage = (currentSeconds, durationMinutes) => {
  if (!durationMinutes || durationMinutes === 0) return 0;
  
  const totalSeconds = durationMinutes * 60;
  const percent = (currentSeconds / totalSeconds) * 100;
  
  // Clamp between 0 and 100
  return Math.min(Math.max(Math.floor(percent), 0), 100);
};

  const handleStartCourse = async (course) => {
    setSelectedCourse(course);
    const existing = progress.find(p => p.course_id === course.id);
    const status = calculateStatus(secondsRef.current, course.duration_minutes)
    if (!existing || existing.status === 'not_started') {
      await updateProgressMutation.mutateAsync({
        courseId: course.id,
        data: {
          status: 'status',
          started_at: new Date().toISOString(),
          last_watched_at: new Date().toISOString(),
          progress_percent: status === 'completed' ? 100 : Math.floor((seconds / (course.duration_minutes * 60)) * 100),
         
        }
      });
    }
  };

  const handleCompleteCourse = async (course) => {
    setLocalProgress(100);
    await updateProgressMutation.mutateAsync({
      courseId: course.id,
      data: {
        status: 'completed',
        progress_percent: 100,
        completed_at: new Date().toISOString(),
        last_watched_at: new Date().toISOString()
      }
    });
    toast.success('Course completed! Great job!');
    setSelectedCourse(null);
  };

  


  const filteredCourses = courses.filter(course => {
    const matchesSearch = course.title?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = categoryFilter === 'all' || course.category === categoryFilter;
    return matchesSearch && matchesCategory;
  });

  const inProgressCourses = courses.filter(c => 
    getProgressForCourse(c.id)?.status === 'in_progress'
  );

  const completedCourses = courses.filter(c => 
    getProgressForCourse(c.id)?.status === 'completed'
  );

  const categories = ['safety', 'operations', 'maintenance', 'business', 'technical'];

  const difficultyColors = {
    beginner: 'bg-emerald-100 text-emerald-700',
    intermediate: 'bg-amber-100 text-amber-700',
    advanced: 'bg-rose-100 text-rose-700'
  };
  const handleVideoDurationUpdate = async (durationInSeconds) => {
    const totalMinutes = Math.round(durationInSeconds / 60); // Round for total duration
   console.log(`Video total duration: ${totalMinutes} minutes.`)
    // Only update if the duration is different from what's currently stored
    // to avoid unnecessary API calls
    if (selectedCourse && selectedCourse?.duration_minutes !== totalMinutes && !!totalMinutes) {
      // You'd call your API to update the course's duration here
      // For example:
      selectedCourse.duration_minutes = totalMinutes;
      await updateCourseMutation.mutateAsync({courseId: selectedCourse?.id,
        data: { duration_minutes: totalMinutes }});
      console.log(`Video total duration: ${totalMinutes} minutes. Updating course ${selectedCourse}  duration.`);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Wie-University"
        subtitle="Learn at your own pace with our comprehensive course library"
      />

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatsCard title="Total Courses" value={courses.length} icon={BookOpen} />
        <StatsCard title="In Progress" value={inProgressCourses.length} icon={Play} variant="primary" />
        <StatsCard title="Completed" value={completedCourses.length} icon={CheckCircle2} variant="success" />
        <StatsCard 
          title="Watch Time" 
          value={`${progress.reduce((sum, p) => sum + Math.floor(Number(p.watch_time_seconds || 0)/60), 0)} min`} 
          icon={Clock} 
        />
      </div>

      {/* Continue Learning Section */}
      {inProgressCourses.length > 0 && (
        <Card className="border-0 shadow-sm bg-gradient-to-r from-[#1e3a5f] to-[#2d5a8a]">
          <CardContent className="p-6">
            <h2 className="text-lg font-semibold text-white mb-4">Continue Learning</h2>
            <div className="flex gap-4 overflow-x-auto pb-2">
              {inProgressCourses.slice(0, 3).map(course => {
                const courseProgress = getProgressForCourse(course.id);
                return (
                  <div 
                    key={course.id} 
                    className="flex-shrink-0 w-72 bg-white/10 backdrop-blur rounded-lg p-4 cursor-pointer hover:bg-white/20 transition-colors"
                    onClick={() => setSelectedCourse(course)}
                  >
                    <p className="font-medium text-white truncate">{course.title}</p>
                    <div className="flex items-center gap-2 mt-3">
                      <Progress value={courseProgress?.progress_percent || 0} className="flex-1 h-2" />
                      <span className="text-white/80 text-sm">{courseProgress?.progress_percent || 0}%</span>
                    </div>
                    <Button size="sm" className="mt-3 w-full bg-white text-[#1e3a5f] hover:bg-white/90">
                      <Play className="h-4 w-4 mr-2" />
                      Continue
                    </Button>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Tabs & Filters */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <TabsList>
            <TabsTrigger value="all">All Courses</TabsTrigger>
            <TabsTrigger value="in_progress">In Progress</TabsTrigger>
            <TabsTrigger value="completed">Completed</TabsTrigger>
          </TabsList>
          
          <div className="flex gap-3">
            <div className="relative flex-1 sm:w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <Input
                placeholder="Search courses..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="Category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                {categories.map(cat => (
                  <SelectItem key={cat} value={cat} className="capitalize">
                    {cat}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <TabsContent value="all" className="mt-6">
          <CourseGrid 
            courses={filteredCourses} 
            progress={progress}
            onSelect={setSelectedCourse}
            onStart={handleStartCourse}
            difficultyColors={difficultyColors}
          />
        </TabsContent>

        <TabsContent value="in_progress" className="mt-6">
          <CourseGrid 
            courses={inProgressCourses.filter(c => 
              c.title?.toLowerCase().includes(searchTerm.toLowerCase()) &&
              (categoryFilter === 'all' || c.category === categoryFilter)
            )} 
            progress={progress}
            onSelect={setSelectedCourse}
            onStart={handleStartCourse}
            difficultyColors={difficultyColors}
          />
        </TabsContent>

        <TabsContent value="completed" className="mt-6">
          <CourseGrid 
            courses={completedCourses.filter(c => 
              c.title?.toLowerCase().includes(searchTerm.toLowerCase()) &&
              (categoryFilter === 'all' || c.category === categoryFilter)
            )} 
            progress={progress}
            onSelect={setSelectedCourse}
            onStart={handleStartCourse}
            difficultyColors={difficultyColors}
          />
        </TabsContent>
      </Tabs>

      {/* Course Player Dialog */}
      <Dialog open={!!selectedCourse}  onOpenChange={(open) => {
    // If we are closing the dialog (open is false)
    if (!open) {
      // Trigger the mutation one last time on close
      const seconds = secondsRef.current
      const course = selectedCourseRef.current;
      const status = calculateStatus(seconds, selectedCourse.duration_minutes)
      updateProgressMutation.mutate({
        courseId: selectedCourseRef.current.id,
        data: {
          watch_time_seconds: secondsRef.current,
          // duration_minutes: selectedCourse.duration_minutes,
          last_watched_at: new Date().toISOString(),
          progress_percent: status === 'completed' ? 100 : Math.floor((seconds / (course.duration_minutes * 60)) * 100),
          status: status
        }
      });
      setSelectedCourse(null);
    }
  }}
>
        <DialogContent className="sm:max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{selectedCourse?.title}</DialogTitle>
          </DialogHeader>
          {selectedCourse && (
            <div className="space-y-4">
              {/* Video Player */}
              <div className="aspect-video bg-slate-900 rounded-lg overflow-hidden flex items-center justify-center">
                {selectedCourse.video_storage_key ? (
                  <CourseVideo key={selectedCourse.id} videoKey={selectedCourse.video_storage_key} onLoadedMetadata={(playedSeconds) => {
                    setCurrentSeconds(Math.floor(playedSeconds))
                    // secondsRef.current = playedSeconds;
                    const newPercent = calculatePercentage(playedSeconds, selectedCourse.duration_minutes);
                    setLocalProgress(newPercent);

                  }} onVideoDuration={handleVideoDurationUpdate} watchTimeSeconds={(getProgressForCourse(selectedCourse?.id)?.watch_time_seconds || 0)}/>
                ) : (
                  <div className="text-center text-white">
                    <Play className="h-16 w-16 mx-auto mb-4 opacity-50" />
                    <p className="text-slate-400">Video content coming soon</p>
                  </div>
                )}
              </div>

              {/* Course Info */}
              <div className="flex items-center gap-3">
                <Badge variant="outline" className="capitalize">{selectedCourse.category}</Badge>
                <Badge className={difficultyColors[selectedCourse.difficulty_level]}>
                  {selectedCourse.difficulty_level}
                </Badge>
                {selectedCourse.duration_minutes && (
                  <span className="text-sm text-slate-500 flex items-center gap-1">
                    <Clock className="h-4 w-4" />
                    {selectedCourse.duration_minutes} min
                  </span>
                )}
              </div>

              {selectedCourse.description && (
                <p className="text-slate-600">{selectedCourse.description}</p>
              )}

              {/* Progress */}
              <div className="flex items-center justify-between p-4 bg-slate-50 rounded-lg">
                <div>
                  <p className="text-sm text-slate-500">Your Progress</p>
                  <div className="flex items-center gap-3 mt-1">
                    <Progress 
                      value={localProgress}  
                      className="w-48 h-2" 
                    />
                    <span className="font-medium">
                    {localProgress}%
                    </span>
                  </div>
                </div>
                {getProgressForCourse(selectedCourse.id)?.status !== 'completed' && (
                  <Button 
                    onClick={() => handleCompleteCourse(selectedCourse)}
                    className="bg-emerald-600 hover:bg-emerald-700"
                  >
                    <CheckCircle2 className="h-4 w-4 mr-2" />
                    Mark Complete
                  </Button>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function CourseGrid({ courses, progress, onSelect, onStart, difficultyColors }) {
  if (courses.length === 0) {
    return (
      <EmptyState
        icon={BookOpen}
        title="No courses found"
        description="Try adjusting your search or filters"
      />
    );
  }

  const getProgressForCourse = (courseId) => {
    return progress.find(p => p.course_id === courseId);
  };

  return (
    <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
      {courses.map(course => {
        const courseProgress = getProgressForCourse(course.id);
        const isCompleted = courseProgress?.status === 'completed';
        const isInProgress = courseProgress?.status === 'in_progress';

        return (
          <Card 
            key={course.id} 
            className="border-0 shadow-sm hover:shadow-md transition-all cursor-pointer group"
            onClick={() => onStart(course)}
          >
            <CardContent className="p-0">
              {/* Thumbnail */}
              <div className="aspect-video bg-slate-100 rounded-t-lg overflow-hidden relative">
                {course.thumbnail_storage_key ? (
                  <PublicImage
                    docKey={course.thumbnail_storage_key} 
                    alt={course.title} 
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-[#1e3a5f] to-[#2d5a8a]">
                    <BookOpen className="h-12 w-12 text-white/50" />
                  </div>
                )}
                
                {/* Play overlay */}
                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                  <div className="w-14 h-14 bg-white rounded-full flex items-center justify-center">
                    <Play className="h-6 w-6 text-[#1e3a5f] ml-1" />
                  </div>
                </div>

                {/* Progress bar */}
                {(isInProgress || isCompleted) && (
                  <div className="absolute bottom-0 left-0 right-0 h-1 bg-black/20">
                    <div 
                      className={`h-full ${isCompleted ? 'bg-emerald-500' : 'bg-[#1e3a5f]'}`}
                      style={{ width: `${courseProgress.progress_percent || 0}%` }}
                    />
                  </div>
                )}
              </div>

              {/* Content */}
              <div className="p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Badge variant="outline" className="capitalize text-xs">
                    {course.category}
                  </Badge>
                  <Badge className={`${difficultyColors[course.difficulty_level]} text-xs`}>
                    {course.difficulty_level}
                  </Badge>
                  {course.is_mandatory && (
                    <Badge variant="destructive" className="text-xs">Required</Badge>
                  )}
                </div>
                
                <h3 className="font-semibold text-slate-900 line-clamp-2 mb-2 group-hover:text-[#1e3a5f] transition-colors">
                  {course.title}
                </h3>
                
                <div className="flex items-center justify-between">
                  {course.duration_minutes && (
                    <span className="text-sm text-slate-500 flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {course.duration_minutes} min
                    </span>
                  )}
                  
                  {isCompleted ? (
                    <span className="text-sm text-emerald-600 font-medium flex items-center gap-1">
                      <CheckCircle2 className="h-4 w-4" />
                      Completed
                    </span>
                  ) : isInProgress ? (
                    <span className="text-sm text-[#1e3a5f] font-medium">
                      {courseProgress.progress_percent}% complete
                    </span>
                  ) : (
                    <ChevronRight className="h-4 w-4 text-slate-400 group-hover:text-[#1e3a5f] transition-colors" />
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}